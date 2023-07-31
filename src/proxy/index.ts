import type Session from "../session";
import * as cheerio from 'cheerio';

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
      minify: true
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

  $("head").append("<script>" + scriptContentCache.replace("<<BASE_URL>>", base_url.href) + "</script>");
  return $.html();
}

export const makeProxiedRequestTo = async (to: string, session: Session, request: Request) => {
  const url = new URL(to);
  const request_headers = new Headers(request.headers);
  
  // We get the cookies from our session.
  const cookies = session.getCookiesAsStringFor(url.hostname, url.pathname);
  request_headers.set("cookie", cookies);

  // NOTE: This header can cause issues, see if it changes anything to keep it or no.
  request_headers.delete("host");
  request_headers.delete("origin")
  request_headers.delete("referer");

  // TODO: We don't handle properties such as `gzip, deflate, br`, yet.
  request_headers.delete("accept-encoding"); 

  url.searchParams.delete("__surfonxy_url");
  url.searchParams.delete("__surfonxy_ready");

  const response = await fetch(url, {
    method: request.method,
    headers: request_headers,
    body: request.body,
    credentials: request.credentials,
    redirect: "manual",
    cache: request.cache,
    keepalive: request.keepalive,
    verbose: false
  });
  
  const response_headers = registerCookies(response, session);

  const giveNewResponse = (body: ReadableStream<any> | null) => new Response(body, {
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
      new_redirection_url.searchParams.set("__surfonxy_url", btoa(redirection_url.origin));
      new_redirection_url.searchParams.delete("__surfonxy_ready") // If there was one...

      response_headers.set("location", new_redirection_url.href);
    }
  }

  // When the content is HTML, we have to tweak the document a little...
  const contentType = response_headers.get("content-type");
  if (contentType?.includes("text/html")) {
    const isServiceWorkerReady = request.url.includes("__surfonxy_ready=1");

    const stringToStream = (str: string) => {
      const buffer = Buffer.from(str);
      const chunkSize = 1024;

      return new ReadableStream({
        start(controller) {
          for (let i = 0; i < buffer.length; i += chunkSize) {
            controller.enqueue(buffer.subarray(i, i + chunkSize));
          }

          controller.close();
        },
      });
    }

    if (isServiceWorkerReady) {
      let content = await Bun.readableStreamToText(response.body as ReadableStream);
      content = await tweakHTML(content, session.id, url);

      return giveNewResponse(stringToStream(content));
    }
    else {
      return giveNewResponse(stringToStream(`
        <!DOCTYPE html>
        <html>
          <head>
            <script>
              navigator.serviceWorker.register("/surfonxy.js?__surfonxy_url=${btoa(url.origin)}")
              .then(reg => {
                const refresh = () => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("__surfonxy_ready", "1");
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
                else {
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
      `))
    }
  }

  return giveNewResponse(response.body);
}