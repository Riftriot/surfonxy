/// <reference lib="WebWorker" />
declare const self: ServiceWorkerGlobalScope;

import { SURFONXY_URI_ATTRIBUTES } from "~/utils/constants";

self.addEventListener("install", () => {
  self.skipWaiting();
  console.info("worker: installed !");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.disable();
      }

      self.clients.claim();
      console.info(
        "worker: activated, should be redirected as soon as claimed."
      );
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.stopPropagation();
  event.stopImmediatePropagation();

  const originalRequest = event.request;
  const sendOriginalRequest = () => fetch(originalRequest);

  try {
    event.respondWith(
      (async () => {
        let originalRequestURL = new URL(originalRequest.url);

        // Don't care about extensions, and anything that is not a *real* request.
        if (!originalRequestURL.protocol.startsWith("http")) {
          return sendOriginalRequest();
        }

        const client = await self.clients.get(event.clientId);
        if (!client?.url) return sendOriginalRequest();

        const originalClientURL = new URL(client.url);

        // Get the real origin.
        let clientURL: URL | string | null = originalClientURL.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
        if (clientURL === null) {
          console.warn(`worker: no "${SURFONXY_URI_ATTRIBUTES.URL}" found in original client URL.`);
          return sendOriginalRequest();
        }

        // decode the whole real URL
        try {
          clientURL = new URL(
            originalClientURL.pathname + originalClientURL.search + originalClientURL.hash,
            atob(decodeURIComponent(clientURL))
          );

          // we remove params only needed for surfonxy.
          clientURL.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
          clientURL.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);
        }
        catch {
          console.warn(`worker: "${SURFONXY_URI_ATTRIBUTES.URL}" is not a valid base64 encoded value.`);
          return sendOriginalRequest();
        }

        // We ignore already patched requests...
        if (originalRequestURL.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
          // TODO: re-patch the URL using the origin from originalRequestURL ?
          if (originalRequestURL.origin !== originalClientURL.origin) {
            console.warn("worker: already patched request, but not from our domain ?", {
              clientURL: clientURL.href,
              originalClientURL: originalClientURL.href,
              originalRequestURL: originalRequestURL.href
            });
          }

          // already patched request, we send as it is.
          return sendOriginalRequest();
        }
        
        /**
         * handle requests that are from our domains
         * it means that it's probably some relative URL that we need to patch.
         * 
         * example with the following variables:
         * originalRequestURL = "https://surfonxy.dev/images/something.svg"
         * clientURL = "https://example.com/"
         * 
         * we need to transform `originalRequestURL` to:
         * "https://example.com/images/something.svg"
         */
        if (originalClientURL.origin === originalRequestURL.origin) {
          // we rebuild `originalRequestURL` since `origin` is a read-only property.
          originalRequestURL = new URL(
            originalRequestURL.pathname + originalRequestURL.search + originalRequestURL.hash,
            // we use the client's origin because it's a relative URL (from this URL).
            clientURL.origin
          );
        }

        // we rebuild the whole path but using our patch domain
        const requestURL = new URL(
          originalRequestURL.pathname + originalRequestURL.search + originalRequestURL.hash,
          originalClientURL.origin // our patch domain
        );

        // we set the real URL as a base64 encoded value
        requestURL.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(originalRequestURL.origin));
        requestURL.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1"); // Always "1" since SW is installed !

        // we get this as text to be able to send it back
        // note: see if using .text() affects anything
        const requestBodyAsText = await originalRequest.text();

        // rebuild our request object
        const request = new Request(requestURL, {
          body: (
            originalRequest.method !== "GET" &&
            originalRequest.method !== "HEAD" &&
            requestBodyAsText
          ) ? requestBodyAsText : void 0,
          method: originalRequest.method,
          headers: originalRequest.headers,
          redirect: originalRequest.redirect,
          mode: originalRequest.mode,
          credentials: originalRequest.credentials
        });

        return fetch(request);
      })()
    );
  }
  catch (error) {
    console.error("worker:", error, originalRequest);
  }
});
