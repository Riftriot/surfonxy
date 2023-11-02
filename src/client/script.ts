/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import {
  SURFONXY_URI_ATTRIBUTES,
  SURFONXY_LOCALSTORAGE_SESSION_ID_KEY,
  SURFONXY_WEBSOCKET_PATH_PREFIX,
  createSurfonxyServiceWorkerPath,
} from "~/utils/constants";

import { NATIVE } from "~/client/sandbox/native";
import { proxiedLocation } from "~/client/utils/location";
import { simpleRewriteURL } from "~/client/utils/rewrite";

// TODO: Should do a verification for the session ID, if exists or not.
const PROXY_SESSION_ID = localStorage.getItem(SURFONXY_LOCALSTORAGE_SESSION_ID_KEY) as string;

(function checkInitialURIParameters() {
  // Can be `null`.
  // We don't use the "===" here because we want to catch `"null"` as well.
  if (window.location.origin == "null") return;

  const url = new NATIVE.URL(window.location.href);
  if (!url.searchParams.get(SURFONXY_URI_ATTRIBUTES.READY)) {
    url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
  }

  if (!url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
    url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(proxiedLocation.origin));
  }

  window.history.replaceState(window.history.state, "", url);
})();

// Add this to prevent unregister.
window.addEventListener("load", () => {
  // Can be `null`.
  // We don't use the "===" here because we want to catch `"null"` as well.
  if (window.location.origin == "null") return;

  navigator.serviceWorker.register(
    new NATIVE.URL(createSurfonxyServiceWorkerPath(PROXY_SESSION_ID), window.location.origin)
  );
});

// @ts-expect-error
// Add the location proxy to the window.
window.__sf_location = proxiedLocation;
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

(function patchAnchorElements() {
  const proto = window.HTMLAnchorElement.prototype;
  const href_descriptor = Object.getOwnPropertyDescriptor(proto, "href") as PropertyDescriptor;

  const href_descriptor_set = href_descriptor.set;
  const href_descriptor_get = href_descriptor.get;

  Object.defineProperty(proto, "href", {
    get () {
      const url = href_descriptor_get?.call(this) as string | null;
      if (!url) return url;

      const patched_url = simpleRewriteURL(url);
      return patched_url.href;
    },

    set (original_url: string) {
      const patched_url = simpleRewriteURL(original_url);
      href_descriptor_set?.call(this, patched_url.href);
    },

    configurable: true,
    enumerable: true
  });
})();

(function patchSubmitForm() {
  const patchActionAttribute = (element: HTMLFormElement) => {
    const original_action = element.getAttribute("action");
    if (!original_action) return;

    const patched_action = simpleRewriteURL(original_action).href;
    element.setAttribute("action", patched_action);
  };

  const addInputsToForm = (element: HTMLElement) => {
    const url_parameter = document.createElement("input");
    url_parameter.setAttribute("hidden", "true");
    url_parameter.setAttribute("name", SURFONXY_URI_ATTRIBUTES.URL);
    url_parameter.setAttribute("value", btoa(proxiedLocation.origin));

    const ready_parameter = document.createElement("input");
    ready_parameter.setAttribute("hidden", "true");
    ready_parameter.setAttribute("name", SURFONXY_URI_ATTRIBUTES.READY);
    ready_parameter.setAttribute("value", "1");

    element.appendChild(url_parameter);
    element.appendChild(ready_parameter);
  };

  const formSubmitOriginal = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    patchActionAttribute(this);
    const method = this.method.toUpperCase();
  
    if (method === "GET") {
      addInputsToForm(this);
    }
  
    // @ts-expect-error
    formSubmitOriginal.apply(this, arguments);
  };

  window.addEventListener("submit", (event) => {
    if (!event.target) return;
    patchActionAttribute(event.target as HTMLFormElement);
    addInputsToForm(event.target as HTMLFormElement);
  }, true);
})();

(function patchWebSockets() {
  // @ts-expect-error
  window.WebSocket = function () {
    let url = arguments[0] as string | URL;
    if (typeof url === "string") {
      url = new NATIVE.URL(url);
    }

    const patched_url = new NATIVE.URL(
      SURFONXY_WEBSOCKET_PATH_PREFIX + url.pathname + url.search + url.hash,
      window.location.origin
    );

    patched_url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(url.origin));
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.ORIGIN, btoa(proxiedLocation.origin));

    arguments[0] = patched_url;

    // @ts-expect-error
    return new NATIVE.WebSocket(...arguments);
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
        return proxiedLocation.href;
      },
    
      // No-op.
      set () {},
  
      configurable: true,
      enumerable: true
    });

    Object.defineProperty(proto, "documentURI", {
      get () {
        return proxiedLocation.href;
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
        return proxiedLocation.hostname;
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

/**
 * Patch `window.open()`.
 * See <https://developer.mozilla.org/docs/Web/API/Window/open>
 */
(function patchWindowOpen() {
  const originalWindowOpen = window.open;
  window.open = function () {
    const original_url = arguments[0] as string | URL | undefined;
    
    // when the URL is set because it can be blank (about:blank).
    if (original_url) {
      arguments[0] = simpleRewriteURL(original_url).href;
    }
    
    // @ts-expect-error
    return originalWindowOpen.apply(this, arguments); 
  };
})();

/**
 * Patch the URL from `getRegistration` method
 * of `ServiceWorkerContainer` prototype.
 */
(function rewriteServiceWorkerGetRegistration() {
  const originalGetRegistration = window.ServiceWorkerContainer.prototype.getRegistration;
  
  window.ServiceWorkerContainer.prototype.getRegistration = function () {
    const original_url = arguments[0];
    const patched_url = simpleRewriteURL(original_url);

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
    const patched_url = new NATIVE.URL(import_url, script_href).href;
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
        const patched_url = simpleRewriteURL(original_url);
        arguments[2] = patched_url.href;
      }

      // @ts-expect-error
      original.apply(this, arguments);
    };
  }
})();

/**
 * Patch `HTMLIFrameElement.prototype.src` to proxy the value
 * and `HTMLIFrameElement.prototype.setAttribute` to intercept the value set to `src`.
 */
(function patchIframePrototype() {
  const prototype = window.HTMLIFrameElement.prototype;

  // We patch the `HTMLIFrameElement.prototype.src`.
  const src_descriptor = Object.getOwnPropertyDescriptor(prototype, "src") as PropertyDescriptor;
  
  const src_descriptor_set = src_descriptor.set;
  const src_descriptor_get = src_descriptor.get;

  Object.defineProperty(prototype, "src", {
    get () {
      return src_descriptor_get?.call(this);
    },

    set (original_url: string) {
      const patched_url = simpleRewriteURL(original_url);
      src_descriptor_set?.call(this, patched_url.href);
    },

    configurable: true,
    enumerable: true
  });
  
  // We patch `HTMLIFrameElement.prototype.setAttribute`.
  const originalIframeSetAttribute = prototype.setAttribute;

  window.HTMLIFrameElement.prototype.setAttribute = function () {
    const attr_name = arguments[0];
    const original_url = arguments[1];

    if (attr_name === "src" && original_url) {
      arguments[1] = simpleRewriteURL(original_url).href;
    }

    // @ts-expect-error
    originalIframeSetAttribute.apply(this, arguments);
  };
})();

(function patchMessageEvents() {
  // @ts-expect-error
  window.__sf_preparePostMessageData = (data: unknown) => {
    // Mostly a debugging function.
    // Insert anything here to debug.

    console.log("postMessage:", data);
    return data;
  };

  // @ts-expect-error
  window.__sf_preparePostMessageOrigin = function (origin: unknown) {
    if ("Window" in window) {
      if (typeof origin === "string" || origin instanceof String) {
        return "*";
      }
    }
    
    return origin;
  };

  if ("MessageEvent" in window) {
    const messageEventProto = window.MessageEvent.prototype;
    const messageEventOriginDescriptor = Object.getOwnPropertyDescriptor(messageEventProto, "origin") as PropertyDescriptor;

    Object.defineProperty(messageEventProto, "origin", {
      get () {
        let origin = messageEventOriginDescriptor.get?.apply(this) as unknown;
        
        if (typeof origin === "string") {
          // @ts-expect-error
          origin = window.__sf_location.origin;
        
          // If there's a payload...
          if ("source" in this) {
            return this.source.__sf_location.origin;
          }
        }

        return origin;
      },
  
      set () {
        const origin = arguments[0];
        if (origin) {
          // @ts-expect-error
          arguments[0] = typeof origin === "string" ? window.__sf_location.origin : origin;
        }

        // @ts-expect-error
        messageEventOriginDescriptor.set?.apply(this, arguments);
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
        let origin = extendableMessageEventDescriptor.get?.apply(this) as unknown;
        
        if (typeof origin === "string") {
          // @ts-expect-error
          origin = window.__sf_location.origin;
        
          // If there's a payload...
          if ("source" in this) {
            return this.source.__sf_location.origin;
          }
        }

        return origin;
      },
  
      set () {
        const origin = arguments[0];
        if (origin) {
          // @ts-expect-error
          arguments[0] = typeof origin === "string" ? window.__sf_location.origin : origin;
        }

        // @ts-expect-error
        extendableMessageEventDescriptor.set?.apply(this, arguments);
      },

      configurable: true,
      enumerable: true
    });
  }
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
      const original_url = new NATIVE.URL(original_raw_url);

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
      const url = new NATIVE.URL(
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
