import type Session from "../session";
import * as cheerio from 'cheerio';

import { SURFONXY_GENERATED_ATTRIBUTE, SURFONXY_LOCALSTORAGE_SESSION_ID_KEY, SURFONXY_SERVICE_WORKER_PATH, SURFONXY_URI_ATTRIBUTES, createSurfonxyServiceWorkerPath } from "../utils/constants";

let workerContentCache: string | undefined;
/** Builds the service worker for the proxy. */
const getServiceWorker = async () => {
  if (!workerContentCache) {
    const result = await Bun.build({
      entrypoints: [Bun.fileURLToPath(new URL("../client/worker.ts", import.meta.url))],
      target: "browser",
      minify: false
    });

    workerContentCache = await result.outputs[0].text();
  }

  const headers = new Headers();
  headers.set("content-type", "text/javascript");

  return new Response(workerContentCache, {
    status: 200,
    headers
  });
}


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

export const tweakHTML = async (content: string, session_id: string, base_url: URL): Promise<string> => {
  const $ = cheerio.load(content);

  if (!scriptContentCache) {
    const result = await Bun.build({
      entrypoints: [Bun.fileURLToPath(new URL("../client/script.ts", import.meta.url))],
      target: "browser",
      minify: false
    });

    scriptContentCache = await result.outputs[0].text();
  }

  // const transformUrl = (url: string) => {
  //   if (url.startsWith("/")) {
  //     const url_object = new URL(url, base_url.origin);
  //     url_object.searchParams.set("__surfonxy_url", btoa(base_url.origin));  
  //     return url_object.pathname + url_object.search;
  //   }
  //   return url;
  //   // const url_object = new URL(url);
  //   // const base_url_obj = new URL(base_url);
  //   // base_url_obj.pathname = url_object.pathname;
  //   // base_url_obj.search = url_object.search;
  //   // base_url_obj.searchParams.set("__surfonxy_url", btoa(url_object.origin));  

  //   // return base_url_obj.pathname + base_url_obj.search;
  // }

  // $("[href]").each((_, item) => {
  //   item.attribs.href = transformUrl(item.attribs.href);
  // });

  // $("[src]").each((_, item) => {
  //   item.attribs.src = transformUrl(item.attribs.src);
  // });

  // $("form[action]").each((_, item) => {
  //   item.attribs.action = transformUrl(item.attribs.action);
  // });

  // We travel through every inline scripts, and tweak them.
  $("script").not("[src]").each(function () {
    const new_script_content = tweakJS($(this).html() as string);
    $(this).html(new_script_content);
  });

  // Add `<base>`, <https://developer.mozilla.org/docs/Web/HTML/Element/base>
  // > Rewrites every relative URLs in the DOM.
  // > There can be only one `<base>` element.
  // const base_element_href = $("head base").prop("href");
  // if (!base_element_href) {
  //   $("head").append(`<base href="${base_url.href}" ${SURFONXY_GENERATED_ATTRIBUTE}="1" />`);
  // }

  // Add our client script at the beginning of the `head` of the document.
  $("head").prepend(`<script ${SURFONXY_GENERATED_ATTRIBUTE}="1">
    ${scriptContentCache.replace("<<BASE_URL>>", base_url.href)}
  </script>`);

  return $.html();
}

const tweakJS = (content: string): string => {
  content = content.replaceAll("location", "__sf_location");
  return content;
}

export const createProxiedResponse = async (request: Request, session: Session): Promise<Response> => {
  /** The original URL, from the client. */
  const request_proxy_url = new URL(request.url);
  if (request_proxy_url.pathname === SURFONXY_SERVICE_WORKER_PATH) {
    return getServiceWorker();
  }

  const encoded_request_url = request_proxy_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
  if (!encoded_request_url) {
    throw new Error(`No URL provided in the "${SURFONXY_URI_ATTRIBUTES.URL}" search parameter.`);
  }

  let request_url: URL;
  try {
    const decoded_request_url = atob(encoded_request_url)
    request_url = new URL(request_proxy_url.pathname + request_proxy_url.search, decoded_request_url);
  }
  catch (error) {
    // TODO: Add a better error handling, with custom Error class.
    throw new Error("The provided URL is either...\n\t- Not an origin ;\n\t- Not a base64 encoded value.\n...or both, maybe.");
  }

  const request_headers = new Headers(request.headers);
  
  // We get the cookies from our session.
  const cookies = session.getCookiesAsStringFor(request_url.hostname, request_url.pathname);
  request_headers.set("cookie", cookies);

  // NOTE: This header can cause issues, see if it changes anything to keep it or no.
  request_headers.delete("host");
  request_headers.delete("origin")
  request_headers.delete("referer");

  // TODO: We don't handle properties such as `gzip, deflate, br`, yet.
  request_headers.delete("accept-encoding"); 

  request_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
  request_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);

  const response = await fetch(request_url, {
    method: request.method,
    headers: request_headers,
    body: request.body,
    redirect: "manual"
  });
  
  const response_headers = registerCookies(response, session);

  const giveNewResponse = (body: ReadableStream<Uint8Array> | string | null) => new Response(body, {
    headers: response_headers,

    // Just give the actual values.
    status: response.status,
    statusText: response.statusText
  })

  // When there's a redirection
  if (response.status >= 300 && response.status <= 399) {
    const redirect_to = response_headers.get("location");
    if (redirect_to) {
      const redirection_url = new URL(redirect_to);
      const new_redirection_url = new URL(redirection_url.pathname + redirection_url.search, new URL(request.url).origin);
      new_redirection_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(redirection_url.origin));
      new_redirection_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY) // If there was one...

      response_headers.set("location", new_redirection_url.href);
    }
  }

  // When the content is HTML, we have to tweak the document a little...
  const contentType = response_headers.get("content-type");
  if (contentType?.includes("text/html")) {
    const isServiceWorkerReady = request.url.includes(`${SURFONXY_URI_ATTRIBUTES.READY}=1`);

    if (isServiceWorkerReady) {
      let content = await Bun.readableStreamToText(response.clone().body as ReadableStream<Uint8Array>);
      content = await tweakHTML(content, session.id, request_url);

      return giveNewResponse(content);
    }
    else {
      return giveNewResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <script>
              localStorage.setItem("${SURFONXY_LOCALSTORAGE_SESSION_ID_KEY}", "${session.id}");

              navigator.serviceWorker.register("${createSurfonxyServiceWorkerPath(session.id)}")
              .then(reg => {
                const refresh = () => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("${SURFONXY_URI_ATTRIBUTES.READY}", "1");
                  window.location.href = url.href;
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
      `)
    }
  }
  else if (contentType?.includes("text/javascript")) {
    let content = await Bun.readableStreamToText(response.clone().body as ReadableStream<Uint8Array>);
    content = tweakJS(content);

    return giveNewResponse(content);
  }

  return giveNewResponse(response.clone().body as ReadableStream<Uint8Array>);
}