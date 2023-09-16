import type Session from "../session";
import * as cheerio from "cheerio";

import {
  SURFONXY_GENERATED_ATTRIBUTE,
  SURFONXY_LOCALSTORAGE_SESSION_ID_KEY,
  SURFONXY_SERVICE_WORKER_PATH,
  SURFONXY_URI_ATTRIBUTES,
  createSurfonxyServiceWorkerPath,
} from "../utils/constants";

import { tweakJS } from "./tweaks/javascript";

let workerContentCache: string | undefined;
/** Builds the service worker for the proxy. */
const getServiceWorker = async () => {
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
  const cookies = response.headers?.getAll("set-cookie") ?? [];
  session.addCookies(cookies);

  // We prevent returning the cookies to client,
  // since the client doesn't have to store them!
  // Everything is handled by Surfonxy.
  headers.delete("set-cookie");

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

let scriptContentCache: string | undefined;

export const tweakHTML = async (
  content: string,
  request_url: URL,
  proxied_url: URL,
  options: ProxyOptions
): Promise<string> => {
  const $ = cheerio.load(content);

  if (!scriptContentCache) {
    const result = await Bun.build({
      entrypoints: [
        Bun.fileURLToPath(new URL("../client/script.ts", import.meta.url)),
      ],
      target: "browser",
      minify: false,
    });

    scriptContentCache = await result.outputs[0].text();
  }

  const transformUrl = (url: string) => {
    if (url.startsWith("data:")) return url;
    if (url[0] === "#") return url;

    try {
      if (url[0] === "/" && url[1] !== "/") {
        const url_object = new URL(url, request_url.origin);
        url_object.searchParams.set(
          SURFONXY_URI_ATTRIBUTES.URL,
          btoa(proxied_url.origin)
        );
        url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
        return url_object.pathname + url_object.search + url_object.hash;
      }

      // We should add origin for double slashes URLs.
      const url_object =
        url[1] === "/" ? new URL(url, request_url.origin) : new URL(url);

      // URLs like `ms-windows-store://home/` or `mailto:...` have a
      // `"null"` origin, ignore them.
      if (url_object.origin === "null") return url;

      // We ignore already patched requests.
      if (url_object.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
        // Only ignore if the origin was patched as well.
        if (url_object.origin === request_url.origin)
          return url_object.pathname + url_object.search + url_object.hash;
      }

      const patched_origin =
        url_object.origin === request_url.origin
          ? proxied_url.origin
          : url_object.origin;

      const patched_url = new URL(
        url_object.pathname + url_object.search + url_object.hash,
        request_url.origin
      );
      patched_url.searchParams.set(
        SURFONXY_URI_ATTRIBUTES.URL,
        btoa(patched_origin)
      );
      patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1"); // Always "1" since SW is installed !

      return patched_url.pathname + patched_url.search + patched_url.hash;
    } catch (err) {
      console.error(url, JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return url;
    }
  };

  $("[href]").each(function () {
    const current_href = $(this).attr("href");
    if (!current_href) return;

    $(this).attr("href", transformUrl(current_href));
  });

  $("[src]").each(function () {
    const current_src = $(this).attr("src");
    if (!current_src) return;

    $(this).attr("src", transformUrl(current_src));
  });

  // $("form[action]").each((_, item) => {
  //   item.attribs.action = transformUrl(item.attribs.action);
  // });

  // We travel through every inline scripts, and tweak them.
  $("script")
    .not("[src]")
    .each(function () {
      const new_script_content = tweakJS($(this).html() as string);
      $(this).html(new_script_content);
    });

  // We travel through every scripts and we remove the integrity attribute.
  $("script[integrity]").each(function () {
    $(this).removeAttr("integrity");
  });

  // Rewrite URLs in `meta[http-equiv="refresh"]`.
  // The content could look like this, `0;url=...`
  $(`meta[http-equiv="refresh"]`).each(function () {
    const content = $(this).attr("content");
    if (typeof content === "undefined") return;

    let [delay, url] = content.split(";");
    if (typeof url === "undefined") return;

    // We only want content after the `url=`.
    url = url.slice(4);

    const origin = url.startsWith("/")
      ? proxied_url.origin
      : new URL(url).origin;
    const url_object = new URL(url, origin); // We only put the origin here to have a valid URL.
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(origin));
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");

    url = "url=" + url_object.pathname + url_object.search;

    $(this).attr("content", [delay, url].join(";"));
  });

  // Add `<base>`, <https://developer.mozilla.org/docs/Web/HTML/Element/base>
  // > Rewrites every relative URLs in the DOM.
  // > There can be only one `<base>` element.
  // const base_element_href = $("head base").prop("href");
  // if (!base_element_href) {
  //   $("head").append(`<base href="${base_url.href}" ${SURFONXY_GENERATED_ATTRIBUTE}="1" />`);
  // }

  // Remove every <base> elements from DOM.
  $("head base").each(function () {
    $(this).remove();
  });

  // Add our client script at the beginning of the `head` of the document.
  $("head").prepend(`<script ${SURFONXY_GENERATED_ATTRIBUTE}="1">
    ${scriptContentCache
      .replace("<<BASE_URL>>", proxied_url.href)
      .replace("<<WEBSOCKET_PROXY_PATH>>", options.WEBSOCKET_PROXY_PATH)}
  </script>`);

  return $.html();
};

export interface ProxyOptions {
  /** Should have no trailing slash. */
  WEBSOCKET_PROXY_PATH: string;
}

export const createProxiedResponse = async (
  request: Request,
  session: Session,
  options: ProxyOptions = {
    WEBSOCKET_PROXY_PATH: "/__surfonxy_websocket__",
  }
): Promise<Response> => {
  /** The original URL, from the client. */
  console.log("request url is:", request.url);
  const request_proxy_url = new URL(request.url);
  if (request_proxy_url.pathname === SURFONXY_SERVICE_WORKER_PATH) {
    return getServiceWorker();
  }

  // console.log("request_proxy_url", request_proxy_url);

  const encoded_request_url = request_proxy_url.searchParams.get(
    SURFONXY_URI_ATTRIBUTES.URL
  );
  if (!encoded_request_url) {
    console.error("NO URL", request.url);
    return new Response("No URL provided in the URL search parameter.", {
      status: 400,
    });
    // throw new Error(`No URL provided in the "${SURFONXY_URI_ATTRIBUTES.URL}" search parameter, on ${request_proxy_url.href}.`);
  }

  let request_url: URL;
  try {
    const decoded_request_url = atob(encoded_request_url);
    request_url = new URL(
      request_proxy_url.pathname + request_proxy_url.search,
      decoded_request_url
    );

    const origin = request_url.searchParams.get("origin");

    if (origin) {
      console.log("yes there is origin");

      if (request_url.host) {
        console.log("yes there is host");
        const split = request_url.host.split(".");
        if (split.length > 2) {
          console.log("yes there is > 2");
          request_url.searchParams.set(
            "origin",
            `${request_url.protocol}//www.${split[split.length - 2]}.${
              split[split.length - 1]
            }`
          );
        } else {
          request_url.searchParams.set(
            "origin",
            `${request_url.protocol}//${request_url.host}`
          );
          console.log("no there's no > 2");
        }

        console.log("request_url:", request_url);
        // request_url.href =  request_url.toString();
      }
    }
  } catch (error) {
    // TODO: Add a better error handling, with custom Error class.
    throw new Error(
      "The provided URL is either...\n\t- Not an origin ;\n\t- Not a base64 encoded value.\n...or both, maybe."
    );
  }

  const request_headers = new Headers(request.headers);

  // We get the cookies from our session.
  const cookies = session.getCookiesAsStringFor(
    request_url.hostname,
    request_url.pathname
  );
  request_headers.set("cookie", cookies);

  // NOTE: This header can cause issues, see if it changes anything to keep it or no.
  request_headers.delete("host");
  request_headers.delete("origin");
  request_headers.delete("referer");
  // request_headers.delete("connection");

  // TODO: We don't handle properties such as `gzip, deflate, br`, yet.
  request_headers.delete("accept-encoding");

  request_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
  request_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);

  try {
    const response = await fetch(request_url.href, {
      method: request.method,
      headers: request_headers,
      body: request.body,
      redirect: "manual",
    });

    console.log(response.status, response.url);

    const response_headers = registerCookies(response, session);
    response_headers.delete("content-encoding");

    const giveNewResponse = (
      body: ReadableStream<Uint8Array> | string | null
    ) =>
      new Response(body, {
        headers: response_headers,

        // Just give the actual values.
        status: response.status,
        statusText: response.statusText,
      });

    // When there's a redirection
    if (response.status >= 300 && response.status <= 399) {
      const redirect_to = response_headers.get("location");
      if (redirect_to) {
        const redirection_url = new URL(redirect_to);
        const new_redirection_url = new URL(
          redirection_url.pathname + redirection_url.search,
          new URL(request.url).origin
        );
        new_redirection_url.searchParams.set(
          SURFONXY_URI_ATTRIBUTES.URL,
          btoa(redirection_url.origin)
        );
        new_redirection_url.searchParams.set(
          SURFONXY_URI_ATTRIBUTES.READY,
          "1"
        );
        // new_redirection_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY) // If there was one...

        response_headers.set("location", new_redirection_url.href);
      }
    }

    // When the content is HTML, we have to tweak the document a little...
    const contentType = response_headers.get("content-type");
    if (contentType?.includes("text/html")) {
      const isServiceWorkerReady = request.url.includes(
        `${SURFONXY_URI_ATTRIBUTES.READY}=1`
      );

      if (isServiceWorkerReady) {
        let content = await response.text();
        content = await tweakHTML(
          content,
          request_proxy_url,
          request_url,
          options
        );

        return giveNewResponse(content);
      } else {
        return giveNewResponse(`
          <!DOCTYPE html>
          <html>
            <head>
              <script>
                localStorage.setItem("${SURFONXY_LOCALSTORAGE_SESSION_ID_KEY}", "${
          session.id
        }");
  
                navigator.serviceWorker.register("${createSurfonxyServiceWorkerPath(
                  session.id
                )}")
                .then(reg => {
                  const refresh = () => {
                    if (!isIframe) {
                      const url = new URL(window.location.href);
                      url.searchParams.set("${
                        SURFONXY_URI_ATTRIBUTES.READY
                      }", "1");
                      window.location.href = url.href;
                    }
                  }
  
                  if (reg.installing) {
                    const sw = reg.installing || reg.waiting;
                    sw.onstatechange = function() {
                      if (sw.state === 'installed') {
                        refresh();
                      }
                    };
                  }
                  else if (reg.active) {
                    refresh();
                  }
                })
                .catch(handleError)
              
                function handleError(error) {
                  console.error(error);
                }
              </script>
              <title>Loading...</title>
            </head>
            <body>
              <h1>Wait, the service worker is loading !</h1>
              <p>You'll be automatically redirected to the proxied page when the worker has been activated.</p>
            </body>
          </html>
        `);
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
  } catch (err) {
    console.error(request.url, err);
    throw new Error("Error while fetching and tweaking the distant URL.");
  }
};
