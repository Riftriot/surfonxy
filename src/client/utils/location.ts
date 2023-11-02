import { NATIVE } from "~/client/sandbox/native";
import { simpleRewriteURL } from "~/client/utils/rewrite";

/**
 * Get the current proxied URL.
 * 
 * Example : `https://surfonxy.dev/?__surfonxy_url=...` -> `https://example.com/`
 */
export const getCurrentURL = () => {
  const base_element = document.querySelector("base");
  if (!base_element) throw new Error("SurfonxyLocation: No base element found.");

  return base_element.href;
};

/**
 * Builder function for the exported `proxiedLocation`.
 */
class SurfonxyLocation {
  get hash(): string {
    return window.location.hash;
  }
  set hash(value: string) {
    window.location.hash = value;
  }

  get host(): string {
    return new NATIVE.URL(this.href).host;
  }
  set host(value: string) {
    new NATIVE.URL(this.href).host = value;
    this.assign(this.href);
  }

  get hostname() {
    return new NATIVE.URL(this.href).hostname;
  }
  set hostname(value: string) {
    new NATIVE.URL(this.href).hostname = value;
    this.assign(this.href);
  }

  get href(): string {
    return getCurrentURL();
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
    return new NATIVE.URL(this.href).port;
  }
  set port(value: string) {
    new NATIVE.URL(this.href).port = value;
    this.assign(this.href);
  }

  get protocol(): string {
    return new NATIVE.URL(this.href).protocol;
  }
  set protocol(value: string) {
    const url = new NATIVE.URL(this.href);
    url.protocol = value.replace(/:$/g, "");
    this.assign(url);
  }

  get search(): string {
    return new NATIVE.URL(this.href).search;
  }
  set search(value: string) {
    const url = new NATIVE.URL(this.href);
    url.search = value;
    this.assign(url);
  }

  get username(): string {
    return new NATIVE.URL(this.href).username;
  }
  set username(value: string) {
    // No operation needed.
  }

  get password(): string {
    return new NATIVE.URL(this.href).password;
  }
  set password(value: string) {
    // No operation needed.
  }

  get origin() {
    return new NATIVE.URL(this.href).origin;
  }

  assign(url: string | URL): void {
    window.location.assign(simpleRewriteURL(url));
  }

  /**
   * @param forceReload - Only supported in Firefox.
   */
  reload(forceReload: boolean): void {
    // @ts-expect-error
    window.location.reload(forceReload);
  }

  replace(url: string | URL): void {
    window.location.replace(simpleRewriteURL(url));
  }

  toString(): string {
    return this.href;
  }

  toJSON() {
    const url = new NATIVE.URL(this.href);

    return {
      // NOTE: I have no idea what does `ancestorOrigins` is supposed to be.
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
}

export const proxiedLocation = new SurfonxyLocation();
