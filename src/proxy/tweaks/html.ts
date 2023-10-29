import type { ProxyOptions } from "../types";
import * as cheerio from "cheerio";

import {
  SURFONXY_GENERATED_ATTRIBUTE,
  SURFONXY_URI_ATTRIBUTES,
} from "../../utils/constants";

import { tweakJS } from "./javascript";

let scriptContentCache: string | undefined;

export const tweakHTML = async (
  content: string,
  request_url: URL,
  proxied_url: URL,
  options: ProxyOptions,
  /**
   * If the content is from a `srcdoc` attribute, we don't want to tweak the
   * location object, because of iframe.
   */
  isSrcDoc = false
): Promise<string> => {
  const $ = cheerio.load(content);

  if (!scriptContentCache) {
    const result = await Bun.build({
      entrypoints: [
        Bun.fileURLToPath(new URL("../../client/script.ts", import.meta.url)),
      ],
      target: "browser",
      minify: false,
    });

    scriptContentCache = await result.outputs[0].text();
  }

  const transformUrl = (url: string) => {
    if (url.startsWith("data:")) return url;
    if (url[0] === "#") return url;

    try {
      /**
       * URLs like `href="something.html"`
       */
      if (url[0] !== "/" && !url.startsWith("http")) {
        // remove the last part of the URL (the file name)
        const request_url_pathname = request_url.pathname.split("/");
        request_url_pathname.pop();
        request_url_pathname.push(url);
        url = request_url_pathname.join("/");
      }

      /** URLs like `href="//example.com/..."` */
      if (url[0] === "/" && url[1] !== "/") {
        const url_object = new URL(url, request_url.origin);
        url_object.searchParams.set(
          SURFONXY_URI_ATTRIBUTES.URL,
          btoa(proxied_url.origin)
        );
        url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");
        return url_object.pathname + url_object.search + url_object.hash;
      }

      // We should add origin for double slashes URLs.
      const url_object = url[1] === "/" ? new URL(url, request_url.origin) : new URL(url);

      // URLs like `ms-windows-store://home/` or `mailto:...` have a
      // `"null"` origin, ignore them.
      if (url_object.origin === "null") return url;

      // We ignore already patched requests.
      if (url_object.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL)) {
        // Only ignore if the origin was patched as well.
        if (url_object.origin === request_url.origin)
          return url_object.pathname + url_object.search + url_object.hash;
      }

      const patched_origin = url_object.origin === request_url.origin
        ? proxied_url.origin
        : url_object.origin;

      const patched_url = new URL(
        url_object.pathname + url_object.search + url_object.hash,
        request_url.origin
      );
      patched_url.searchParams.set(
        SURFONXY_URI_ATTRIBUTES.URL,
        btoa(patched_origin)
      );
      patched_url.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1"); // Always "1" since SW is installed !

      return patched_url.pathname + patched_url.search + patched_url.hash;
    }
    catch (err) {
      console.error(url, JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return url;
    }
  };

  $("[href]").each(function () {
    const current_href = $(this).attr("href");
    if (!current_href) return;

    $(this).attr("href", transformUrl(current_href));
  });

  $("[src]").each(function () {
    const current_src = $(this).attr("src");
    if (!current_src) return;

    $(this).attr("src", transformUrl(current_src));
  });

  // $("form[action]").each((_, item) => {
  //   item.attribs.action = transformUrl(item.attribs.action);
  // });

  // We travel through every inline scripts, and tweak them.
  $("script")
    .not("[src]")
    .each(function () {
      const new_script_content = tweakJS($(this).html() as string, isSrcDoc);
      $(this).html(new_script_content);
    });

  // We travel through every scripts and we remove the integrity attribute.
  $("script[integrity]").each(function () {
    $(this).removeAttr("integrity");
  });

  // Rewrite URLs in `meta[http-equiv="refresh"]`.
  // The content could look like this, `0;url=...`
  $("meta[http-equiv=\"refresh\"]").each(function () {
    const content = $(this).attr("content")?.split(";");
    if (typeof content === "undefined") return;

    const delay = content[0];
    let url = content[1];

    if (typeof url === "undefined") return;

    // We only want content after the `url=`.
    url = url.slice(4);

    const origin = url.startsWith("/")
      ? proxied_url.origin
      : new URL(url).origin;
    const url_object = new URL(url, origin); // We only put the origin here to have a valid URL.
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.URL, btoa(origin));
    url_object.searchParams.set(SURFONXY_URI_ATTRIBUTES.READY, "1");

    url = "url=" + url_object.pathname + url_object.search;

    $(this).attr("content", [delay, url].join(";"));
  });

  const iframes: Array<cheerio.Cheerio<cheerio.Element>> = [];
  $("iframe[srcdoc]").each(function () {
    const current_srcdoc = $(this).attr("srcdoc");
    if (!current_srcdoc) return;
    
    iframes.push($(this));
  });

  for (const iframe of iframes) {
    iframe.attr("srcdoc", await tweakHTML(iframe.attr("srcdoc") as string, request_url, proxied_url, options, true));
  }

  // Add `<base>`, <https://developer.mozilla.org/docs/Web/HTML/Element/base>
  // > Rewrites every relative URLs in the DOM.
  // > There can be only one `<base>` element.
  // const base_element_href = $("head base").prop("href");
  // if (!base_element_href) {
  //   $("head").append(`<base href="${base_url.href}" ${SURFONXY_GENERATED_ATTRIBUTE}="1" />`);
  // }

  // Remove every <base> elements from DOM.
  $("head base").each(function () {
    $(this).remove();
  });

  // Add our client script at the beginning of the `head` of the document.
  $("head").prepend(`<script ${SURFONXY_GENERATED_ATTRIBUTE}="1">
    ${scriptContentCache
    .replace("<<BASE_URL>>", proxied_url.href)
    .replace("<<WEBSOCKET_PROXY_PATH>>", options.WEBSOCKET_PROXY_PATH)}
  </script>`);

  return $.html();
};