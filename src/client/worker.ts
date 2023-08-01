/// <reference lib="WebWorker" />

import {} from "./worker"; // Useless import to prevent typing issues.
declare const self: ServiceWorkerGlobalScope;

/** Value from the URL parameter `__surfonxy_url` when the service worker was initialized. */
let currentlyProxyingURL: URL;
/** Origin to replace with in patched requests. */
let proxyOrigin: string;

self.addEventListener("install", () => {
  console.info("[service-worker]: installing...");

  currentlyProxyingURL = new URL(atob(new URL(location.href).searchParams.get("__surfonxy_url") as string));
  console.info("[service-worker]: setting current proxying URL to", currentlyProxyingURL);
  proxyOrigin = new URL(location.href).origin;
  console.info("[service-worker]: setting current proxy origin URL to", proxyOrigin);

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.info("[service-worker]: activated, should be redirected as soon as claimed.");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const original_request = event.request;

  try {
    const original_url = new URL(original_request.url);
  
    // We leave the request untouched when it's something we don't need.
    if (original_url.protocol === "chrome-extension:" || original_url.search.includes("__surfonxy_url")) {
      event.respondWith(fetch(original_request));
      return;
    }
  
    // When the origin is the same, that means that it should be on the `currentlyProxyingURL` origin.
    const patched_origin = original_url.origin === proxyOrigin
      ? currentlyProxyingURL.origin
      : original_url.origin
  
    const patched_url = new URL(original_url.pathname + original_url.search, proxyOrigin);
    patched_url.searchParams.set("__surfonxy_url", btoa(patched_origin))
    patched_url.searchParams.set("__surfonxy_ready", "1"); // Always "1" since SW is installed !
  
    const patched_request = new Request(patched_url, {
      body: original_request.body,
      method: original_request.method,
      headers: original_request.headers,
      redirect: original_request.redirect,
      credentials: original_request.credentials,
    });
  
    console.info("[service-worker]:", "original", original_request, "patched", patched_request);
    event.respondWith(fetch(patched_request));
  }
  catch (error) {
    console.error("[service-worker]:", error, original_request)
  }
});
