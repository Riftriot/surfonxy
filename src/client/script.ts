/// <reference lib="DOM" />

// To be replaced by Bun.
const BASE_URL = new URL("<<BASE_URL>>");

// Add this to prevent unregister.
window.addEventListener('load', () => {
  navigator.serviceWorker.register(`/surfonxy.js?__surfonxy_url=${btoa(BASE_URL.origin)}`);
});

const transformUrl = (url_r: string) => {
  if (!url_r) return url_r;
  // @ts-expect-error
  const url = url_r instanceof TrustedScriptURL ? url_r.toString() : (url_r as string);
  
  // If it was already transformed, don't touch it.
  if (url.includes("__surfonxy_url=")) return url;
  
  if (url.startsWith("/")) {
    const url_object = new URL(url, BASE_URL.origin);
    url_object.searchParams.set("__surfonxy_url", btoa(BASE_URL.origin));  
    url_object.searchParams.set("__surfonxy_ready", "1");  
    return url_object.pathname + url_object.search;
  }
    
  const url_object = new URL(url);
  const base_url_obj = new URL(url_object.pathname + url_object.search, BASE_URL.origin);
  base_url_obj.searchParams.set("__surfonxy_url", btoa(url_object.origin));  
  url_object.searchParams.set("__surfonxy_ready", "1");  

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

  for (const attr of prototypesToFix[classElement ]) {
    if (!window[classElement]) {
      console.warn('unexpected unsupported element class ' + classElement);
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(window[classElement].prototype, attr) as PropertyDescriptor;
    const originalGet = descriptor.get;
    const originalSet = descriptor.set;

    descriptor.set = function (e) {
      e = transformUrl(e);
      return originalSet?.call(this, e);
    };

    descriptor.get = function () {
      return transformUrl(originalGet?.call(this));
    };

    Object.defineProperty(window[classElement].prototype, attr, descriptor);
  }
}
