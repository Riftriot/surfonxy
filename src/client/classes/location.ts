import URI from "urijs";
import Uri from "./uri";

import CustomElement from "./element";
import { SURFONXY_GENERATED_ATTRIBUTE } from "../../utils/constants";

export class WorkerLocation {
  get hash (): string {
    return window.location.hash;
  }

  get host () {
    return this.Gt().host();
  }

  get hostname () {
    return this.Gt().hostname();
  }

  get href () {
    return this.getHref();
  }

  get pathname () {
    return window.location.pathname;
  }

  get port () {
    return this.Gt().port()
  }

  get protocol () {
    return this.Gt().protocol() + ':'
  }

  get search () {
    return this.Gt().search()
  }

  get origin () {
    return this.Gt().origin()
  }

  toString () {
    return this.getHref()
  }

  getHref (_0x1021da = false) {
    var uri = new Uri(window.location.href);
    return !_0x1021da || uri.gt(true)
      ? uri.p()
      : window.location.href
  }
  
  Gt (_0x42f932 = false) {
    return URI(this.getHref(_0x42f932))
  }

  xt () {
    return this.Gt(true)
  }
};

export class Location extends WorkerLocation {
  public proxyUrl: string;
  public passiveMode: boolean;

  constructor (proxyUrl: string, passiveMode = false) {
    super();

    this.proxyUrl = proxyUrl;
    this.passiveMode = passiveMode;

    window.addEventListener('hashchange', () => {
      this.updateGeneratedBaseElement()
    }, true);

    // Fired when the active history entry changes
    // while the user navigates the session history.
    window.addEventListener('popstate', () => {
      this.updateGeneratedBaseElement()
    }, true);
  }

  get hash () {
    return super.hash;
  }
  set hash (value: string) {
    window.location.hash = value;
  }
  
  get host () {
    return super.host;
  }
  set host (value: string) {
    this.assign(this.Gt().host(value).href())
  }

  get hostname () {
    return super.hostname;
  }
  set hostname (value: string) {
    this.assign(this.Gt().hostname(value).href())
  }
  
  get href () {
    return super.href;
  }
  set href (value: string) {
    this.assign(value)
  }

  get pathname () {
    return super.pathname
  }
  set pathname (value: string) {
    window.location.pathname = value;
  }

  get port () {
    return super.port;
  }
  set port (value: string) {
    this.assign(this.Gt().port(value).href())
  }

  get protocol () {
    return super.protocol
  }
  set protocol (value: string) {
    this.assign(this.Gt().protocol(value.replace(/:$/g, '')).href())
  }

  get search () {
    return super.search
  }
  set search (value: string) {
    this.assign(this.Gt().search(value).href());
  }

  get username () {
    return this.Gt().username();
  }
  set username (value: string) {
    // No operation needed.
  }

  get password () {
    return this.Gt().password();
  }
  set password (value: string) {
    // No operation needed.
  }

  /** Navigates to the given URL. */
  assign (url: string) {
    window.location.assign(url)
  }
  /**
   * @param forceReload - Only supported in Firefox.
   */
  reload (forceReload: boolean) {
    // @ts-expect-error
    window.location.reload(forceReload);
  }
  
  replace (url: string) {
    window.location.replace(
      this.passiveMode
        ? url + ''
        : new Uri(url).tt()
    )
  }

  ['xt']() {
    let baseElement = window.document.querySelector('base');
    if (baseElement) {
      baseElement = new CustomElement(baseElement).St('href') as unknown as HTMLBaseElement;
      if (baseElement) {
        return URI(baseElement).absoluteTo(this.Gt())
      }
    }
    let _0x353aff = this.getHref()
    return (
      !new Uri(_0x353aff).wt() &&
        this.proxyUrl &&
        (_0x353aff = new Uri(this.proxyUrl).p()),
      URI(_0x353aff)
    )
  }

  /** Update the `<base>` element added from the proxy. */
  updateGeneratedBaseElement () {
    const baseElement = window.document.querySelector(
      'base[' + SURFONXY_GENERATED_ATTRIBUTE + ']'
    );
    
    if (baseElement) {
      baseElement.setAttribute('href', this.getHref());
    }

    return this;
  }
};