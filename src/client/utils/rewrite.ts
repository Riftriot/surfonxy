import { NATIVE } from "~/client/sandbox/native";
import { proxiedLocation } from "~/client/utils/location";

import { SURFONXY_URI_ATTRIBUTES } from "~/utils/constants";

/**
 * Very simple URL rewriting.
 * Should work for most cases.
 */
export const simpleRewriteURL = (original_url: URL | string): URL => {
  // when the URL is a string...
  if (typeof original_url === "string") {
    // if the URL passes, it was something like...
    // `https://example.com/...`
    try {
      original_url = new NATIVE.URL(original_url);
    }
    // the url is a relative OR absolute path so something like...
    // `/path/file` or `./path/file`, ...
    catch {
      // so we assign the origin to the URL.
      // so it becomes `https://example.com/path/file`.
      original_url = new NATIVE.URL(original_url, proxiedLocation.href);
    }
  }

  let patched_url = new NATIVE.URL(original_url);
  if (patched_url.origin !== window.location.origin) {
    patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(patched_url.origin));

    // we rebuild the url with the base origin.
    patched_url = new NATIVE.URL(
      patched_url.pathname + patched_url.search + patched_url.hash,
      window.location.origin
    );
  }

  patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
  return patched_url;
};
