/// <reference lib="WebWorker" />
declare const self: ServiceWorkerGlobalScope;

import { SURFONXY_URI_ATTRIBUTES } from "../utils/constants";

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
        /** URL in the fetch. */
        const originalRequestURL = new URL(originalRequest.url);

        // Don't care about extensions, and anything that is not a *real* request.
        if (!originalRequestURL.protocol.startsWith("http")) {
          return sendOriginalRequest();
        }

        // We ignore already patched requests.
        if (originalRequestURL.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL) === "1") {
          // Only ignore if the origin was patched as well.
          // NOTE: Why we had this again ??
          // if (originalRequestURL.origin === originalClientURL.origin)
          return sendOriginalRequest();
        }

        const client = await self.clients.get(event.clientId);
        if (!client?.url) return sendOriginalRequest();

        // previous_client_url = client?.url ?? (previous_client_url as string);
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

          clientURL.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
          clientURL.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);
        }
        catch {
          console.warn(`worker: "${SURFONXY_URI_ATTRIBUTES.URL}" is not a valid base64 encoded value.`);
          return sendOriginalRequest();
        }

        // TODO: handle requests that are from our domains
        // note: can maybe a pain to fix, depending on the clientURL
        if (originalClientURL.origin === originalRequestURL.origin) {
          console.warn("worker:", {
            clientURL: clientURL.href,
            originalClientURL: originalClientURL.href,
            originalRequestURL: originalRequestURL.href
          });

          return sendOriginalRequest();
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
          redirect: originalRequest.redirect
        });

        return fetch(request);
      })()
    );
  }
  catch (error) {
    console.error("worker:", error, originalRequest);
  }
});
