/// <reference lib="WebWorker" />

import {} from "./worker"; // Useless import to prevent typing issues.
declare const self: ServiceWorkerGlobalScope;

import { SURFONXY_URI_ATTRIBUTES } from "../utils/constants";

self.addEventListener("install", () => {
  self.skipWaiting();
  console.info("[service-worker]: installed !");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.disable();
      }
      
      self.clients.claim();
      console.info("[service-worker]: activated, should be redirected as soon as claimed.");
    })()
  );
});

let previous_client_url: string;

self.addEventListener("fetch", (event) => {
  event.stopPropagation();
  event.stopImmediatePropagation();

  const original_request = event.request;
  const sendOriginalRequest = () => fetch(original_request);

  try {
    event.respondWith((async () => {
      /** URL in the fetch. */
      const original_request_url = new URL(original_request.url);
      const client = await self.clients.get(event.clientId);

      if (!client?.url && !previous_client_url) return sendOriginalRequest();
      previous_client_url = (client?.url ?? previous_client_url as string);
      const client_url = new URL(previous_client_url);

      const proxy_origin_encoded = client_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
      if (!proxy_origin_encoded) return sendOriginalRequest();

      let proxy_origin_decoded: string;
      try {
        // We wrap it in a try/catch to "catch" decoding errors.
        proxy_origin_decoded = atob(decodeURIComponent(proxy_origin_encoded));
      }
      catch { return sendOriginalRequest(); }
    
      // We only handle `http` and `https` requests, for now.
      if (!original_request_url.protocol.startsWith("http")) return sendOriginalRequest();
      
      // We ignore already patched requests.
      if (original_request_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
        // Only ignore if the origin was patched as well.
        if (original_request_url.origin === client_url.origin) return sendOriginalRequest();
      }

      // When the origin is the same, that means that it should be on the `currentlyProxyingURL` origin.
      const patched_origin = original_request_url.origin === client_url.origin
        ? proxy_origin_decoded
        : original_request_url.origin
    
      const patched_url = new URL(original_request_url.pathname + original_request_url.search + original_request_url.hash, client_url.origin);
      patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(patched_origin))
      patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1"); // Always "1" since SW is installed !

      const patched_request_body = await original_request.clone().text();

      const patched_request = new Request(patched_url, {
        body: (original_request.method !== "GET" && original_request.method !== "HEAD" && patched_request_body) ? patched_request_body : void 0,
        method: original_request.method,
        headers: original_request.headers,
        redirect: original_request.redirect,
        // mode: "cors",
        // cache: "default",
        // credentials: "include"
      });
    
      return fetch(patched_request);
    })());
  }
  catch (error) {
    console.error("[service-worker]:", error, original_request)
  }
});
