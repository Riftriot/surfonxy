/// <reference lib="DOM" />

import { SURFONXY_URI_ATTRIBUTES, SURFONXY_LOCALSTORAGE_SESSION_ID_KEY, createSurfonxyServiceWorkerPath } from "../utils/constants";

// To be replaced by Bun.
const BASE_URL = new URL("<<BASE_URL>>");
const PROXY_ORIGIN = window.location.origin;
// TODO: Should do a verification for the session ID, if exists or not.
const PROXY_SESSION_ID = localStorage.getItem(SURFONXY_LOCALSTORAGE_SESSION_ID_KEY) as string;

window.origin = BASE_URL.origin;

// Add this to prevent unregister.
window.addEventListener('load', () => {
  navigator.serviceWorker.register(
    new URL(createSurfonxyServiceWorkerPath(PROXY_SESSION_ID), PROXY_ORIGIN)
  );
});

class SurfonxyLocation {
  private proxyUrl: URL

  constructor () {
    this.proxyUrl = BASE_URL;
  }

  get hash (): string {
    return window.location.hash;
  }
  set hash (value: string) {
    window.location.hash = value;
  }

  get host (): string {
    return this.proxyUrl.host;
  }
  set host (value: string) {
    this.proxyUrl.host = value;
    this.assign(this.proxyUrl);
  }

  get hostname () {
    return this.proxyUrl.hostname;
  }
  set hostname (value: string) {
    this.proxyUrl.hostname = value;
    this.assign(this.proxyUrl);
  }

  get href (): string {
    return this.proxyUrl.href;
  }
  set href (value: string) {
    this.assign(value);
  }

  get pathname () {
    return window.location.pathname;
  }
  set pathname (value: string) {
    window.location.pathname = value;
  }

  get port (): string {
    return this.proxyUrl.port;
  }
  set port (value: string) {
    this.proxyUrl.port = value;
    this.assign(this.proxyUrl);
  }

  get protocol (): string {
    return this.proxyUrl.protocol;
  }
  set protocol (value: string) {
    this.proxyUrl.protocol = value.replace(/:$/g, "");
    this.assign(this.proxyUrl);
  }

  get search (): string {
    return this.proxyUrl.search;
  }
  set search (value: string) {
    this.proxyUrl.search = value;
    this.assign(this.proxyUrl);
  }

  get username (): string {
    return this.proxyUrl.username;
  }
  set username (value: string) {
    // No operation needed.
  }

  get password (): string {
    return this.proxyUrl.password;
  }
  set password (value: string) {
    // No operation needed.
  }

  get origin () {
    return this.proxyUrl.origin;
  }

  assign (url: string | URL): void {
    window.location.assign(
      transformUrl(url)
    );
  }

  toString (): string {
    return this.proxyUrl.href;
  }

  /**
   * @param forceReload - Only supported in Firefox.
   */
  reload (forceReload: boolean): void {
    // @ts-expect-error
    window.location.reload(forceReload);
  } 

  replace (url: string | URL): void {
    window.location.replace(
      transformUrl(url)
    );
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
  
  // If it was already transformed, don't touch it.
  if (url.includes(`${SURFONXY_URI_ATTRIBUTES.URL}=`)) return url;
  // Don't touch [data URLs](https://developer.mozilla.org/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
  if (url.startsWith("data:")) return url;
  
  if (url.startsWith("/")) {
    const url_object = new URL(url, BASE_URL.origin);
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(BASE_URL.origin));  
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");  
    return url_object.pathname + url_object.search;
  }

  const url_object = new URL(url);
  const base_url_obj = new URL(url_object.pathname + url_object.search, BASE_URL.origin);
  base_url_obj.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(url_object.origin));  
  base_url_obj.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");  

  return base_url_obj.pathname + base_url_obj.search;
}

const originalFetch = window.fetch;
window.fetch = function () {
  arguments[0] = transformUrl(arguments[0]);
  // @ts-expect-error
  return originalFetch.apply(this, arguments);
};

const sendBeaconOriginal = navigator.sendBeacon;
navigator.sendBeacon = function () {
  if (typeof arguments[0] === 'string')
    arguments[0] = transformUrl(arguments[0]);
  
  // @ts-expect-error
  return sendBeaconOriginal.apply(this, arguments);
}

const xmlHttpRequestOpenOriginal = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function() {
  arguments[1] = transformUrl(arguments[1]);

  // @ts-expect-error
  xmlHttpRequestOpenOriginal.apply(this, arguments);
};

const formSubmitOriginal = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function() {
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

  // @ts-expect-error
  formSubmitOriginal.apply(this, arguments);
}

const prototypesToFix = {
  HTMLAnchorElement: ['href'],
  HTMLAreaElement: ['href'],
  HTMLBaseElement: ['href'],
  HTMLEmbedElement: ['src'],
  HTMLFormElement: ['action'],
  HTMLFrameElement: ['src'],
  HTMLIFrameElement: ['src'],
  HTMLImageElement: ['src'],
  HTMLInputElement: ['src'],
  HTMLLinkElement: ['href'],
  HTMLMediaElement: ['src'],
  HTMLModElement: ['cite'],
  HTMLObjectElement: ['data'],
  HTMLQuoteElement: ['cite'],
  HTMLScriptElement: ['src'],
  HTMLSourceElement: ['src'],
  HTMLTrackElement: ['src'],
  Request: ["url"]
} as const;

for (const classElementRaw in prototypesToFix) {
  const classElement = classElementRaw as keyof typeof prototypesToFix;

  for (const attr of prototypesToFix[classElement]) {
    if (!window[classElement]) continue;

    const descriptor = Object.getOwnPropertyDescriptor(window[classElement].prototype, attr) as PropertyDescriptor;
    const originalGet = descriptor.get;
    const originalSet = descriptor.set;

    descriptor.set = function (url) {
      const new_url = transformUrl(url);

      // TODO: remove when done debugging.
      console.info(`[${classElement}.${attr}.set]: ${url} -> ${new_url}`);

      return originalSet?.call(this, new_url);
    };

    descriptor.get = function () {
      const url = originalGet?.call(this);
      const new_url = transformUrl(url);
      
      // TODO: remove when done debugging.
      console.info(`[${classElement}.${attr}.get]: ${url} -> ${new_url}`);

      return new_url;
    };

    Object.defineProperty(window[classElement].prototype, attr, descriptor);
  }
}
