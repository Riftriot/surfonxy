/// <reference lib="WebWorker" />

import {} from "./worker"; // Useless import to prevent typing issues.
declare const self: ServiceWorkerGlobalScope;

import { SURFONXY_URI_ATTRIBUTES } from "../utils/constants";


/** Origin to replace with in patched requests. */
let proxyOrigin: string;
let currentlyProxyingURL: URL;

self.addEventListener("install", () => {
  console.info("[service-worker]: installing...");
  proxyOrigin = new URL(location.href).origin;
  
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

self.addEventListener("fetch", (event) => {
  event.stopPropagation();
  event.stopImmediatePropagation();

  const original_request = event.request;

  try {
    event.respondWith((async () => {
      const original_url = new URL(original_request.url);
      const client = await self.clients.get(event.clientId);

      if (client?.url) {
        const url = new URL(client.url);
        currentlyProxyingURL = new URL(url.pathname + url.search,
          atob(url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL) as string)
        );
      }
    
      // We leave the request untouched when it's something we don't need.
      if (original_url.protocol === "chrome-extension:" || original_url.search.includes(SURFONXY_URI_ATTRIBUTES.URL)) {
        return fetch(original_request);
      }

      // When the origin is the same, that means that it should be on the `currentlyProxyingURL` origin.
      const patched_origin = original_url.origin === proxyOrigin
        ? currentlyProxyingURL.origin
        : original_url.origin
    
      const patched_url = new URL(original_url.pathname + original_url.search, proxyOrigin);
      patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(patched_origin))
      patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1"); // Always "1" since SW is installed !
    
      const patched_request = new Request(patched_url, {
        body: original_request.body,
        method: original_request.method,
        headers: original_request.headers,
        redirect: original_request.redirect,
        credentials: original_request.credentials,
      });
    
      // console.info("[service-worker]:", "original", original_request, "patched", patched_request);
      return fetch(patched_request);
    })());
  }
  catch (error) {
    console.error("[service-worker]:", error, original_request)
  }
});
