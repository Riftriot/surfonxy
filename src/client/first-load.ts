/// <reference lib="DOM" />
/// <reference lib="dom.iterable" />

import { SURFONXY_LOCALSTORAGE_SESSION_ID_KEY, createSurfonxyServiceWorkerPath, SURFONXY_URI_ATTRIBUTES } from "../utils/constants";

const SESSION_ID = "<<SESSION_ID>>";
localStorage.setItem(SURFONXY_LOCALSTORAGE_SESSION_ID_KEY, SESSION_ID);
  
navigator.serviceWorker.register(createSurfonxyServiceWorkerPath(SESSION_ID))
  .then(reg => {
    const refresh = () => {
      const url = new URL(window.location.href);
      url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
      window.location.href = url.href;
    };
  
    if (reg.installing) {
      const sw = reg.installing || reg.waiting;
      sw.onstatechange = function() {
        if (sw.state === "installed") {
          refresh();
        }
      };
    }
    else if (reg.active) {
      refresh();
    }
  })
  .catch(console.error);