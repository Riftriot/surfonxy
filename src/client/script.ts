/// <reference lib="DOM" />
/// <reference lib="dom.iterable" />

import {
  SURFONXY_URI_ATTRIBUTES,
  SURFONXY_LOCALSTORAGE_SESSION_ID_KEY,
  createSurfonxyServiceWorkerPath,
} from "../utils/constants";

// To be replaced by Bun.
const WEBSOCKET_PROXY_PATH = "<<WEBSOCKET_PROXY_PATH>>"; // No trailing slash.
const BASE_URL = new URL("<<BASE_URL>>");
const PROXY_ORIGIN = window.location.origin;
// TODO: Should do a verification for the session ID, if exists or not.
const PROXY_SESSION_ID = localStorage.getItem(
  SURFONXY_LOCALSTORAGE_SESSION_ID_KEY
) as string;

(function checkInitialURIParameters() {
  const url = new URL(window.location.href);
  if (!url.searchParams.get(SURFONXY_URI_ATTRIBUTES.READY)) {
    url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
  }

  if (!url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
    url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(BASE_URL.origin));
  }

  window.history.replaceState(window.history.state, "", url);
})();

window.origin = BASE_URL.origin;

// Add this to prevent unregister.
window.addEventListener("load", () => {
  navigator.serviceWorker.register(
    new URL(createSurfonxyServiceWorkerPath(PROXY_SESSION_ID), PROXY_ORIGIN)
  );
});

class SurfonxyLocation {
  private proxyUrl: URL;

  constructor() {
    this.proxyUrl = BASE_URL;
  }

  get hash(): string {
    return window.location.hash;
  }
  set hash(value: string) {
    window.location.hash = value;
  }

  get host(): string {
    return this.proxyUrl.host;
  }
  set host(value: string) {
    this.proxyUrl.host = value;
    this.assign(this.proxyUrl);
  }

  get hostname() {
    return this.proxyUrl.hostname;
  }
  set hostname(value: string) {
    this.proxyUrl.hostname = value;
    this.assign(this.proxyUrl);
  }

  get href(): string {
    return this.proxyUrl.href;
  }
  set href(value: string) {
    this.assign(value);
  }

  get pathname() {
    return window.location.pathname;
  }
  set pathname(value: string) {
    window.location.pathname = value;
  }

  get port(): string {
    return this.proxyUrl.port;
  }
  set port(value: string) {
    this.proxyUrl.port = value;
    this.assign(this.proxyUrl);
  }

  get protocol(): string {
    return this.proxyUrl.protocol;
  }
  set protocol(value: string) {
    this.proxyUrl.protocol = value.replace(/:$/g, "");
    this.assign(this.proxyUrl);
  }

  get search(): string {
    return this.proxyUrl.search;
  }
  set search(value: string) {
    this.proxyUrl.search = value;
    this.assign(this.proxyUrl);
  }

  get username(): string {
    return this.proxyUrl.username;
  }
  set username(value: string) {
    // No operation needed.
  }

  get password(): string {
    return this.proxyUrl.password;
  }
  set password(value: string) {
    // No operation needed.
  }

  get origin() {
    return this.proxyUrl.origin;
  }

  assign(url: string | URL): void {
    window.location.assign(transformUrl(url));
  }

  toString(): string {
    return this.proxyUrl.href;
  }

  /**
   * @param forceReload - Only supported in Firefox.
   */
  reload(forceReload: boolean): void {
    // @ts-expect-error
    window.location.reload(forceReload);
  }

  replace(url: string | URL): void {
    window.location.replace(transformUrl(url));
  }
}

// @ts-expect-error
// Add the location proxy to the window.
window.__sf_location = new SurfonxyLocation();
// @ts-expect-error
// Proxies the window location in the document.
document.__sf_location = window.__sf_location;

const transformUrl = (url_r: string | URL) => {
  if (!url_r) return url_r;
  const url = url_r.toString();

  // Don't touch [data URLs](https://developer.mozilla.org/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
  if (url.startsWith("data:")) return url;
  if (url[0] === "#") return url;

  if (url[0] === "/" && url[1] !== "/") {
    const url_object = new URL(url, window.location.origin);
    url_object.searchParams.set(
      SURFONXY_URI_ATTRIBUTES.URL,
      btoa(BASE_URL.origin)
    );
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
    return url_object.pathname + url_object.search + url_object.hash;
  }

  // We should add origin for double slashes URLs.
  const url_object =
    url[1] === "/" ? new URL(url, window.location.origin) : new URL(url);

  // We ignore already patched requests.
  if (url_object.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
    // Only ignore if the origin was patched as well.
    if (url_object.origin === window.location.origin)
      return url_object.pathname + url_object.search + url_object.hash;
  }

  const patched_origin =
    url_object.origin === window.location.origin
      ? BASE_URL.origin
      : url_object.origin;

  const patched_url = new URL(
    url_object.pathname + url_object.search + url_object.hash,
    window.location.origin
  );
  patched_url.searchParams.set(
    SURFONXY_URI_ATTRIBUTES.URL,
    btoa(patched_origin)
  );
  patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1"); // Always "1" since SW is installed !

  return patched_url.pathname + patched_url.search + patched_url.hash;
};

const originalFetch = window.fetch;
window.fetch = function () {
  arguments[0] = transformUrl(arguments[0]);
  // @ts-expect-error
  return originalFetch.apply(this, arguments);
};

const originalPostMessage = window.postMessage;
window.postMessage = function () {
  if (typeof arguments[1] === "string") {
    arguments[1] = transformUrl(arguments[1]);
  }

  // @ts-expect-error
  originalPostMessage.apply(this, arguments);
};

const sendBeaconOriginal = navigator.sendBeacon;
navigator.sendBeacon = function () {
  if (typeof arguments[0] === "string")
    arguments[0] = transformUrl(arguments[0]);

  // @ts-expect-error
  return sendBeaconOriginal.apply(this, arguments);
};

const xmlHttpRequestOpenOriginal = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function () {
  arguments[1] = transformUrl(arguments[1]);

  // @ts-expect-error
  xmlHttpRequestOpenOriginal.apply(this, arguments);
};

const formSubmitOriginal = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function () {
  const method = this.method.toUpperCase();

  if (method === "GET") {
    const url_parameter = document.createElement("input");
    url_parameter.setAttribute("hidden", "true");
    url_parameter.setAttribute("name", SURFONXY_URI_ATTRIBUTES.URL);
    url_parameter.setAttribute("value", btoa(BASE_URL.origin));

    const ready_parameter = document.createElement("input");
    ready_parameter.setAttribute("hidden", "true");
    ready_parameter.setAttribute("name", SURFONXY_URI_ATTRIBUTES.READY);
    ready_parameter.setAttribute("value", "1");

    this.appendChild(url_parameter);
    this.appendChild(ready_parameter);
  }

  // @ts-expect-error
  formSubmitOriginal.apply(this, arguments);
};

(function patchWebSockets() {
  const OriginalWebSocket = window.WebSocket;

  // @ts-expect-error
  window.WebSocket = function () {
    let url = arguments[0] as string | URL;
    if (typeof url === "string") {
      url = new URL(url);
    }

    const patched_url = new URL(
      WEBSOCKET_PROXY_PATH + url.pathname + url.search + url.hash,
      window.location.origin
    );

    patched_url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(url.origin));
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.ORIGIN, btoa(window.__sf_location.origin));

    console.info(`[window.WebSocket] ${url.href} -> ${patched_url.href}`);
    arguments[0] = patched_url;

    // @ts-expect-error
    return new OriginalWebSocket(...arguments);
  };
})();

const prototypesToFix = {
  HTMLAnchorElement: ["href"],
  HTMLAreaElement: ["href"],
  HTMLBaseElement: ["href"],
  HTMLEmbedElement: ["src"],
  HTMLFormElement: ["action"],
  HTMLFrameElement: ["src"],
  HTMLIFrameElement: ["src"],
  HTMLImageElement: ["src", "srcset"],
  HTMLInputElement: ["src"],
  HTMLLinkElement: ["href"],
  HTMLMediaElement: ["src"],
  HTMLModElement: ["cite"],
  HTMLObjectElement: ["data"],
  HTMLQuoteElement: ["cite"],
  HTMLScriptElement: ["src"],
  HTMLSourceElement: ["srcset"],
  HTMLTrackElement: ["src"],
  Request: ["url"],
} as const;

for (const classElementRaw in prototypesToFix) {
  const classElement = classElementRaw as keyof typeof prototypesToFix;

  for (const attr of prototypesToFix[classElement]) {
    if (!window[classElement]) continue;

    const descriptor = Object.getOwnPropertyDescriptor(
      window[classElement].prototype,
      attr
    ) as PropertyDescriptor;
    const originalGet = descriptor.get;
    const originalSet = descriptor.set;

    descriptor.set = function (url) {
      const new_url = transformUrl(url);

      // TODO: remove when done debugging.
      console.info(`[set][${classElement}.${attr}.set]: ${url} -> ${new_url}`);

      return originalSet?.call(this, new_url);
    };

    descriptor.get = function () {
      const url = originalGet?.call(this);
      const new_url = transformUrl(url);

      // TODO: remove when done debugging.
      console.info(`[get][${classElement}.${attr}.get]: ${url} -> ${new_url}`);

      return new_url;
    };

    Object.defineProperty(window[classElement].prototype, attr, descriptor);
  }
}

// (function patchMetaHttpEquivRefresh () {
//   const descriptor = Object.getOwnPropertyDescriptor(window.HTMLMetaElement.prototype, "content") as PropertyDescriptor;
//   const originalGet = descriptor.get;
//   const originalSet = descriptor.set;

//   descriptor.set = function (url) {
//     const new_url = transformUrl(url);

//     // TODO: remove when done debugging.
//     console.info(`[HTMLMetaElement.content.set]: ${url} -> ${new_url}`);

//     return originalSet?.call(this, url);
//   };

//   descriptor.get = function () {
//     const url = originalGet?.call(this);
//     const new_url = transformUrl(url);

//     // TODO: remove when done debugging.
//     console.info(`[HTMLMetaElement.content.get]: ${url} -> ${new_url}`);

//     return url;
//   };

//   Object.defineProperty(window.HTMLMetaElement.prototype, "content", descriptor);
// })();

// (function patchDataHrefAttribute() {
//   const elements = document.querySelectorAll("[data-href]");
//   console.log("patching data-href", elements);

//   for (const element of elements) {
//     const url = element.getAttribute("data-href");

//     if (url) {
//       const new_url = transformUrl(url);
//       element.setAttribute("data-href", new_url);
//       console.log("patched data-href:", new_url);
//     }
//   }
// })();

/**
 * We patch the `History` prototype.
 * Unlike `Location`, it is not read-only,
 * so we can patch the functions there directly.
 */
(function patchHistoryPrototype() {
  /** Methods we will patch in `window.History.prototype`. */
  const methods = [
    // <https://developer.mozilla.org/docs/Web/API/History/replaceState>
    "replaceState",
    // <https://developer.mozilla.org/docs/Web/API/History/pushState>
    "pushState",
  ] as const;

  for (const method of methods) {
    const original = window.History.prototype[method];

    window.History.prototype[method] = function () {
      const original_url = arguments[2];

      // Third argument - so `arguments[2]` - is `url`, which is optional.
      // > URL must be of the same origin as the current URL; otherwise replaceState throws an exception.
      if (original_url) {
        arguments[2] = transformUrl(arguments[2] as string | URL);
      }

      console.info(`[History.${method}]: ${original_url} -> ${arguments[2]}`);
      // @ts-expect-error
      original.apply(this, arguments);
    };
  }
})();
