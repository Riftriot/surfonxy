/// <reference lib="dom" />
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
  // we can safely ignore about:* URLs.
  if (window.location.href.startsWith("about:")) return;

  const url = new URL(window.location.href);
  if (!url.searchParams.get(SURFONXY_URI_ATTRIBUTES.READY)) {
    url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
  }

  if (!url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
    url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(BASE_URL.origin));
  }

  window.history.replaceState(window.history.state, "", url);
})();

// Add this to prevent unregister.
window.addEventListener("load", () => {
  // Can be `null`.
  // We don't use the "===" here because we want to catch `"null"` as well.
  if (PROXY_ORIGIN == "null") return;

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
    return new URL(this.href).host;
  }
  set host(value: string) {
    new URL(this.href).host = value;
    this.assign(this.href);
  }

  get hostname() {
    return new URL(this.href).hostname;
  }
  set hostname(value: string) {
    new URL(this.href).hostname = value;
    this.assign(this.href);
  }

  get href(): string {
    return BASE_URL.href;
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
    return new URL(this.href).port;
  }
  set port(value: string) {
    new URL(this.href).port = value;
    this.assign(this.href);
  }

  get protocol(): string {
    return new URL(this.href).protocol;
  }
  set protocol(value: string) {
    const url = new URL(this.href);
    url.protocol = value.replace(/:$/g, "");
    this.assign(url);
  }

  get search(): string {
    return new URL(this.href).search;
  }
  set search(value: string) {
    const url = new URL(this.href);
    url.search = value;
    this.assign(url);
  }

  get username(): string {
    return new URL(this.href).username;
  }
  set username(value: string) {
    // No operation needed.
  }

  get password(): string {
    return new URL(this.href).password;
  }
  set password(value: string) {
    // No operation needed.
  }

  get origin() {
    return new URL(this.href).origin;
  }

  assign(url: string | URL): void {
    window.location.assign(transformUrl(url));
  }

  toString(): string {
    return this.href;
  }

  toJSON() {
    const url = new URL(this.href);

    return {
      ancestorOrigins: {},
      hash: url.hash,
      host: url.host,
      hostname: url.hostname,
      href: url.href,
      origin: url.origin,
      pathname: url.pathname,
      port: url.port,
      protocol: url.protocol,
      search: url.search
    };
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

const SF_LOCATION = new SurfonxyLocation();

// @ts-expect-error
// Add the location proxy to the window.
window.__sf_location = SF_LOCATION;
// @ts-expect-error
// Proxies the window location in the document.
document.__sf_location = window.__sf_location;

/**
 * This is made for our AST while patching objects.
 * We don't want to patch the `window` object, but
 * what we can do is make another object in `window`
 * that looks like window but with injected properties.
 */
(function initiateFakeVirtualWindow(){
  // @ts-expect-error
  window.__sf_fake_window = {
    ...window,

    addEventListener: window.addEventListener,
    removeEventListener: window.removeEventListener,

    // Prevent to access original window using `window.window`.
    get window () {
      return this;
    },

    // Overwrite `window.location` to `window.__sf_location`.
    get location() {
      // @ts-expect-error
      return window.__sf_location;
    },
    set location(value) {
      // @ts-expect-error
      window.__sf_location.replace(value);
    },

    document: {
      ...window.document,

      // Overwrite `window.document.referrer` to `window.document.__sf_referrer`.
      get referrer() {
        // @ts-expect-error
        return window.document.__sf_referrer;
      },

      // Overwrite `window.document.location` to `window.document.__sf_location`.
      get location() {
        // @ts-expect-error
        return window.__sf_location;
      },
      set location(value) {
        // @ts-expect-error
        window.__sf_location.replace(value);
      },
    }
  };
})();

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
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.ORIGIN, btoa(SF_LOCATION.origin));

    arguments[0] = patched_url;

    // @ts-expect-error
    return new OriginalWebSocket(...arguments);
  };
})();

/**
 * Patches the following prototypes :
 * - `Document.prototype.documentURI` available on `document.documentURI` ;
 * - `Document.prototype.URL` available on `document.URL` ;
 * And the following for the *old alias of `Document`*, see <https://developer.mozilla.org/en-US/docs/Web/API/HTMLDocument>.
 * - `HTMLDocument.prototype.documentURI` ;
 * - `HTMLDocument.prototype.URL`
 */
(function patchDocumentURLs() {
  const protos = [
    window.Document.prototype,
    window.HTMLDocument.prototype
  ];

  for (const proto of protos) {
    Object.defineProperty(proto, "URL", {
      get () {
        return BASE_URL.href;
      },
    
      // No-op.
      set () {},
  
      configurable: true,
      enumerable: true
    });

    Object.defineProperty(proto, "documentURI", {
      get () {
        return BASE_URL.href;
      },
    
      // No-op.
      set () {},
  
      configurable: true,
      enumerable: true
    });
  }
})();

/**
 * Patches the following prototypes :
 * - `Document.prototype.domain` available on `document.domain` ;
 * - `HTMLDocument.prototype.domain` for old alias ;
 */
(function patchDomainFromDocument() {
  const protos = [
    window.Document.prototype,
    window.HTMLDocument.prototype
  ];

  for (const proto of protos) {
    Object.defineProperty(proto, "domain", {
      get () {
        return BASE_URL.hostname;
      },
    
      // No-op.
      set () {},
  
      configurable: true,
      enumerable: true
    });
  }
})();

/**
 * Remove `integrity` property from
 * `<script>` and `<link>` elements.
 */
(function removeIntegrityAttributes() {
  const protos = [
    window.HTMLScriptElement.prototype,
    window.HTMLLinkElement.prototype
  ];
  
  for (const proto of protos) {
    Object.defineProperty(proto, "integrity", {
      /** `null` to remove the value. */
      get () {
        return null;
      },
    
      // No-op.
      set () {},
  
      configurable: true,
      enumerable: true
    });
  }
})();

/**
 * Remove this function since not
 * available inside the proxy.
 */
(function removeNavigatorProtocolHandler() {
  window.navigator.registerProtocolHandler = function () {
    console.error("No protocol handlers can be registered.");
  };
})();

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
 * Very simple URL rewriting.
 * Should work for most cases.
 */
const __sf_simple_rewrite_url = (original_url: URL | string): URL => {
  // when the URL is a string...
  if (typeof original_url === "string") {
    // if the URL passes, it was something like...
    // `https://example.com/...`
    try {
      original_url = new URL(original_url);
    }
    // the url is a relative OR absolute path so something like...
    // `/path/file` or `./path/file`, ...
    catch {
      // so we assign the origin to the URL.
      // so it becomes `https://example.com/path/file`.
      original_url = new URL(original_url, BASE_URL.href);
    }
  }

  let patched_url = new URL(original_url);
  if (patched_url.origin !== window.location.origin) {
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(patched_url.origin));

    // we rebuild the url with the base origin.
    patched_url = new URL(
      patched_url.pathname + patched_url.search + patched_url.hash,
      window.location.origin
    );
  }

  patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
  return patched_url;
};

/**
 * Patch the URL from `getRegistration` method
 * of `ServiceWorkerContainer` prototype.
 */
(function rewriteServiceWorkerGetRegistration() {
  const originalGetRegistration = window.ServiceWorkerContainer.prototype.getRegistration;
  
  window.ServiceWorkerContainer.prototype.getRegistration = function () {
    const original_url = arguments[0];
    const patched_url = __sf_simple_rewrite_url(original_url);

    // but we don't need the parameters
    // so let's just remove them.
    patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
    patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);

    arguments[0] = patched_url.href;
    // @ts-expect-error
    return originalGetRegistration.apply(this, arguments);
  };
})();

/**
 * Patch whenever a module script uses `import(...)`.
 * 
 * In the AST, we patch the `import` function
 * by adding `window.__sf_prepareImport` inside the call.
 * 
 * So `import(a)` becomes `import(window.__sf_prepareImport(a, "..."))`.
 */
(function patchModuleImport() {
  // @ts-expect-error
  window.__sf_prepareImport = (import_url: string, script_href: string) => {
    const patched_url = new URL(import_url, script_href).href;
    return patched_url;
  };
})();

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
      const original_url: URL | string = arguments[2];

      // Third argument - so `arguments[2]` - is `url`, which is optional.
      // > URL must be of the same origin as the current URL; otherwise replaceState throws an exception.
      if (original_url) {
        const patched_url = __sf_simple_rewrite_url(original_url);
        arguments[2] = patched_url.href;
      }

      console.info(`[History.${method}]: ${original_url} -> ${arguments[2]}`);
      // @ts-expect-error
      original.apply(this, arguments);
    };
  }
})();

(function patchIframePrototype() {
  const prototype = window.HTMLIFrameElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "src") as PropertyDescriptor;
  
  const descriptor_set = descriptor.set;
  const descriptor_get = descriptor.get;

  descriptor.set = function (original_url: string) {
    const patched_url = __sf_simple_rewrite_url(original_url);
    return descriptor_set?.call(this, patched_url.href);
  };

  descriptor.get = function () {
    const original_url = descriptor_get?.call(this);
    console.log("iframe.get:", original_url);
    return original_url;
  };
  
  Object.defineProperty(prototype, "src", descriptor);
})();

(function patchMessageEvents() {
  // @ts-expect-error
  window.__sf_preparePostMessageData = (data: unknown) => {
    console.log("preparePostMessageData:", data);
    return data;
  };

  // @ts-expect-error
  window.__sf_preparePostMessageOrigin = function (origin: unknown) {
    console.log(origin);
    if (typeof origin === "string") {
      return "*";
    }

    return origin;
  };

  if ("MessageEvent" in window) {
    const messageEventProto = window.MessageEvent.prototype;
    const messageEventDescriptor = Object.getOwnPropertyDescriptor(messageEventProto, "origin") as PropertyDescriptor;

    Object.defineProperty(messageEventProto, "origin", {
      get () {
        // @ts-expect-error
        const origin = messageEventDescriptor.get?.apply(this);
        return typeof origin === "string" ? BASE_URL.origin : origin;
      },
  
      set () {
        const origin = arguments[0];
        if (origin) {
          arguments[0] = typeof origin === "string" ? BASE_URL.origin : origin;
        }

        // @ts-expect-error
        messageEventDescriptor.set?.apply(this, arguments);
      },

      configurable: true,
      enumerable: true
    });
  }

  if ("ExtendableMessageEvent" in window) {
    const extendableMessageEventProto = window.ExtendableMessageEvent.prototype;
    const extendableMessageEventDescriptor = Object.getOwnPropertyDescriptor(extendableMessageEventProto, "origin") as PropertyDescriptor;

    Object.defineProperty(extendableMessageEventProto, "origin", {
      get () {
        // @ts-expect-error
        const origin = extendableMessageEventDescriptor.get?.apply(this);
        return typeof origin === "string" ? BASE_URL.origin : origin;
      },
  
      set () {
        const origin = arguments[0];
        if (origin) {
          arguments[0] = typeof origin === "string" ? BASE_URL.origin : origin;
        }

        // @ts-expect-error
        extendableMessageEventDescriptor.set?.apply(this, arguments);
      },

      configurable: true,
      enumerable: true
    });
  }
})();

(function patchMessageEvent () {
  const proto = window.MessageEvent.prototype;
  const origin_descriptor = Object.getOwnPropertyDescriptor(proto, "origin") as PropertyDescriptor;

  origin_descriptor.get = function () {
    // TODO
    console.log("MessageEvent.origin.get", arguments);
  };

  origin_descriptor.set = function () {
    // TODO
    console.log("MessageEvent.origin.set", arguments);
  };
})();

(function addProxyToDocumentReferrer () {
  const proto = window.Document.prototype;
  Object.defineProperty(proto, "__sf_referrer", {
    
    /**
     * Fix `https://surfonxy.dev/iframe.html?__surfonxy_url=aHR0cDovL2xvY2FsaG9zdDo4MDAw` instead of `http://localhost:8000/` issues.
     * We should read the URL from the `document.referrer` and parse the URL to
     * rebuild the original one.
     */
    get (): string {
      const original_raw_url = document.referrer;
      if (!original_raw_url) {
        // If we're in an iframe, take the parent location,
        // according to MDN: <https://developer.mozilla.org/en-US/docs/Web/API/Document/referrer#value>
        if (window !== window.parent) {
          // @ts-expect-error
          return window.parent["__sf_location"].protocol + "//" + window.parent["__sf_location"].host + "/";
        }
        else return "";
      }

      // Check if it's a parsable URL.
      // NOTE: Check if it's possible to have a URL that is not parsable.
      if (!original_raw_url.startsWith("http")) {
        // We give the original value, in case it might be useful.
        return original_raw_url;
      }

      // Parse the URL from the referrer.
      const original_url = new URL(original_raw_url);

      // Get the origin from the searchParams.
      let origin = original_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
      if (!origin) {
        console.error("surfonxy: no origin found in the referrer ::", original_url);
        return original_raw_url;
      }

      // Decode the origin from the searchParams.
      try {
        origin = atob(origin);
      }
      catch {
        console.error("surfonxy: invalid base64 origin in the referrer ::", origin);
        return original_raw_url;
      }

      // Rebuild the original URL.
      const url = new URL(
        original_url.pathname + original_url.search + original_url.hash,
        origin
      );

      // Remove attributes needed for Surfonxy.
      url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
      url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY);

      return url.href;
    },

    // Should be read-only, so we don't need to implement this.
    set() {}
  });
})();
