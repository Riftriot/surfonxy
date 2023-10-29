import type Session from "../session";
import type { ProxyOptions } from "./types";

import {
  SURFONXY_SERVICE_WORKER_PATH,
  SURFONXY_URI_ATTRIBUTES
} from "../utils/constants";

import { tweakJS } from "./tweaks/javascript";
import { tweakHTML } from "./tweaks/html";

import { getRequestURL } from "./utils/request";
import { getFirstLoadDocument } from "./templates/first-load";

let workerContentCache: string | undefined;
/** Builds the service worker for the proxy. */
const serviceWorker = async () => {
  if (!workerContentCache) {
    const result = await Bun.build({
      entrypoints: [
        Bun.fileURLToPath(new URL("../client/worker.ts", import.meta.url)),
      ],
      target: "browser",
      minify: false,
    });

    workerContentCache = await result.outputs[0].text();
  }

  const headers = new Headers();
  headers.set("content-type", "text/javascript");

  return new Response(workerContentCache, {
    status: 200,
    headers,
  });
};

/**
 * Stores the cookies of the response in our session's
 * `cookies` object. We then remove every `set-cookie` header
 * from the response to prevent sending them back to the client.
 *
 * @returns New headers for the proxied response.
 */
const registerCookies = (response: Response, session: Session) => {
  const headers = new Headers(response.headers);
  const cookies = response.headers?.get("set-cookie") || "";
  session.addCookies(cookies);
  if (cookies.toLowerCase().includes("httponly")) {
    headers.delete("set-cookie");
  }
  // TODO: Make an options for users to select which headers to trim.
  headers.delete("X-Frame-Options");
  headers.delete("Content-Security-Policy");
  headers.delete("Content-Security-Policy-Report-Only");
  headers.delete("Cross-Origin-Opener-Policy");
  headers.delete("Permissions-Policy");
  headers.delete("X-Xss-Protection");
  headers.delete("Report-To");

  return headers;
};

export const createProxiedResponse = async (
  request: Request,
  session: Session,
  options: ProxyOptions = {
    WEBSOCKET_PROXY_PATH: "/__surfonxy_websocket__",
  }
): Promise<Response> => {
  const request_proxy_url = getRequestURL(request);
  if (request_proxy_url.pathname === SURFONXY_SERVICE_WORKER_PATH) {
    return serviceWorker();
  }

  // When getting from the search params it could be `string | null`.
  // `string` because we get the base64 encoded value of the origin.
  let request_url: string | URL | null = request_proxy_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
  if (!request_url) {
    console.error("NO ORIGIN GIVEN", request_proxy_url.href);
    return new Response(`No ORIGIN provided in the "${SURFONXY_URI_ATTRIBUTES.URL}" search parameter.`, {
      status: 400,
    });
  }

  try {
    // We build the URL from the base64 encoded value.
    request_url = new URL(
      request_proxy_url.pathname + request_proxy_url.search + request_proxy_url.hash,
      // We decode the base64 value to get the origin.
      atob(request_url)
    );

    request_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
    request_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);

    // debug: we log every requests made in the proxy and
    // the real value for easier debugging.
    console.info("[req]", request_url.toString(), "<->", request_proxy_url.toString());
  }
  catch (error) {
    // TODO: Add a better error handling, with custom Error class.
    throw new Error(
      "The provided URL is either...\n\t- Not an origin ;\n\t- Not a base64 encoded value.\n...or both, maybe."
    );
  }

  const request_headers = new Headers(request.headers);

  // We get the cookies from our session.
  const cached_cookies = session.getCookiesAsStringFor(request_url.hostname, request_url.pathname);
  const user_cookies = request_headers.get("cookie") || "";
  // We merge the cookies from the client and the ones from the session. The client's cookies have higher priority.
  const cookies = user_cookies + (cached_cookies ? `; ${cached_cookies}` : "");
  request_headers.set("cookie", cookies);

  // We make sure that the host is the same as the one we're proxying.
  request_headers.set("Host", request_url.host);

  // TODO: proxy
  request_headers.delete("origin");
  request_headers.delete("referer");

  // TODO: We don't handle properties such as `gzip, deflate, br`, yet.
  request_headers.delete("accept-encoding");

  try {
    session.addCookies(request_headers.get("cookie") ?? "");
    const response = await fetch(request_url.href, {
      method: request.method,
      headers: request_headers,
      body: request.body,
      redirect: "manual"
    });

    let cookies = response.headers.get("set-cookie") ?? "";
    // replace domain in cookies with our domain
    cookies = cookies.replace(/domain=[^;]+/g, `domain=${request_url.hostname}`);
    session.addCookies(cookies);
    const response_headers = registerCookies(response, session);
    response_headers.delete("content-encoding");
    // don't send cookies to user if they are http-only 
    if (cookies.toLowerCase().includes("httponly")) {
      response_headers.delete("set-cookie");
    }

    /** helper to return a response using status from actual response and tweaked headers. */
    const giveNewResponse = (
      body: ReadableStream<Uint8Array> | string | null
    ) => (
      new Response(body, {
        headers: response_headers,

        // Just give the actual values.
        status: response.status,
        statusText: response.statusText,
      })
    );

    // When there's a redirection
    if (response.status >= 300 && response.status <= 399) {
      const redirect_to = response_headers.get("location");
      if (redirect_to) {
        const redirection_url = new URL(redirect_to);
        const new_redirection_url = new URL(redirection_url.pathname + redirection_url.search, request_proxy_url.origin);

        new_redirection_url.searchParams.set(
          SURFONXY_URI_ATTRIBUTES.URL,
          btoa(redirection_url.origin)
        );
        new_redirection_url.searchParams.set(
          SURFONXY_URI_ATTRIBUTES.READY,
          "1"
        );

        response_headers.set("location", new_redirection_url.href);
        // TODO: see if the :80 issue on redirection comes from this
        console.info("Made a redirection to ->", new_redirection_url.href);
        return giveNewResponse(null);
      }
    }

    // When the content is HTML, we have to tweak the document a little...
    const contentType = response_headers.get("content-type");
    if (contentType?.includes("text/html")) {
      const isServiceWorkerReady = request_proxy_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.READY);

      if (isServiceWorkerReady === "1") {
        let content = await response.text();

        content = await tweakHTML(
          content,
          request_proxy_url,
          request_url,
          options
        );

        return giveNewResponse(content);
      }
      else {
        const document = await getFirstLoadDocument(session.id);
        // installing service-worker page before showing the actual page
        return giveNewResponse(document);
      }
    }
    // Also tweak JavaScript files.
    // According to <https://www.rfc-editor.org/rfc/rfc4329.txt>, JavaScript files
    // can have two media types, which are `application/javascript`
    // and `text/javascript` - but this one should be obsolete.
    else if (contentType?.match(/(application|text)\/javascript/)) {
      let content = await response.text();
      content = tweakJS(content);

      return giveNewResponse(content);
    }

    return giveNewResponse(response.body);
  }
  catch (err) {
    console.error(request.url, err);
    throw new Error("Error while fetching and tweaking the distant URL.");
  }
};
