
/// <reference lib="WebWorker" />

import {} from "."; // Useless import to prevent typing issues.
declare const self: ServiceWorkerGlobalScope


import { WorkerLocation } from "../classes/location";

import { Base64 as B64 } from "js-base64";
import { default as r_URI } from "urijs";
import { uppercaseFirstLetter, uppercaseFirstLetterOfSecondString } from "../utils/strings";
import Uri from "../classes/uri";
// We make it a variable because it'll be patched later.
let URI = r_URI;

let $window = self;
let $hostname = $window.location.hostname;
let $origin = $window.location.origin;
let $location = new WorkerLocation();

class __Cpn {
  V = $window;
  G = $hostname;
  X = $origin;
  u = $location;

  constructor () {
    this.initScope($window, this)
      .initCacheOverride($window, this)
      .initPostedMessageOverride($window, this)
      .initUri($window, this)
      .initWorker($window, this)
      .initCpn()
      .Worker.create()
      .o();
  }

  initScope ($window: ServiceWorkerGlobalScope, global_this) {
    class Scope {
      _t () {
        try {
          global_this.B($window, 'fetch',
            function (originalFn, args) {
              var _0xb2f698 = args[0]
              return (
                _0xb2f698 instanceof Request ||
                  (_0xb2f698 = new Request(_0xb2f698)),
                this['__cpn'].ut(_0xb2f698).then(function (tweaked_config) {
                  const fetch_config = args[1];

                  if ('object' == typeof fetch_config) {
                    fetch_config.mode = tweaked_config.mode;
                    fetch_config.credentials = tweaked_config.credentials;
                    fetch_config.cache = tweaked_config.cache;
                    fetch_config.referrer = tweaked_config.referrer;
                    delete fetch_config.integrity;
                    args[1] = fetch_config
                  }

                  args[0] = tweaked_config
                  return originalFn(args);
                })
              )
            },
            true,
            true
          )
        } catch (error) {
          global_this.g(error);
        }

        return this;
      }

      /** Patch `self.origin`. */
      X () {
        $window.origin = global_this.u.origin;
        return this;
      }

      xt () {
        try {
          global_this.v(
            $window.ServiceWorkerRegistration.prototype,
            'scope',
            function (_0x2fd8ba) {
              return (
                (_0x2fd8ba = this['__cpn'].URI(_0x2fd8ba())),
                (_0x2fd8ba.origin(this['__cpn'].u.origin),
                _0x2fd8ba.toString())
              )
            },
            function () {}
          )
        } catch (_0x358f33) {
          global_this.g(_0x358f33)
        }
        return this
      }

      /** Patch `XMLHttpRequest` when existing in self scope. */
      $t () {
        if (!('XMLHttpRequest' in $window)) return this;
        try {
          global_this.B(
            $window.XMLHttpRequest.prototype,
            'open',
            function (_0x3ed0e1, _0x2c3338) {
              return (
                (_0x2c3338[1] = this['__cpn'].Uri.create(_0x2c3338[1]).S()),
                _0x3ed0e1(_0x2c3338)
              )
            }
          )
        } catch (error) {
          global_this.g(error)
        }
        try {
          global_this.v(
            $window.XMLHttpRequest.prototype,
            'responseURL',
            function (_0x871cca) {
              return this['__cpn'].Uri.create(_0x871cca()).l()
            },
            function () {}
          )
        } catch (error) {
          global_this.g(error)
        }
        
        return this;
      }

        ['At'](_0xa0e93a, _0x45b9ae, _0x2b88d6 = false, _0xe438dd = false) {
          return (
            global_this.v(
              _0xa0e93a,
              _0x45b9ae,
              function (_0x4cdd6d) {
                return (
                  (_0x4cdd6d = this['__cpn'].Uri.create(_0x4cdd6d())),
                  _0xe438dd && !_0x4cdd6d.Et(true) ? '' : _0x4cdd6d.l()
                )
              },
              _0x2b88d6
                ? function () {}
                : function (_0x291eef, _0x29e4ef) {
                    _0x291eef(this['__cpn'].Uri.create(_0x29e4ef).S())
                  }
            ),
            this
          )
        }
    }

    this.Scope = Scope;
    return this;
  }

  initPostedMessageOverride (_0x2851b3, _0x1134a5) {
      return (
        (this.PostedMessageOverride = class {
          static ['create']() {
            return new this()
          }
          constructor() {
            this.t = '__data'
            this.i = '__origin'
          }
          ['o']() {
            const _0x49bea3 = this
            _0x2851b3['__cpPreparePostMessageData'] = function (_0x32a19f) {
              var _0x20ca2c
              return 'Window' in _0x2851b3
                ? (((_0x20ca2c = new _0x2851b3.Object())[_0x49bea3.t] =
                    _0x49bea3.h(_0x32a19f)),
                  (_0x20ca2c[_0x49bea3.i] = _0x1134a5.u.origin),
                  _0x20ca2c)
                : _0x32a19f
            }
            _0x2851b3['__cpPreparePostMessageOrigin'] = function (_0x2a3fb7) {
              return 'Window' in _0x2851b3 &&
                ('string' == typeof _0x2a3fb7 || _0x2a3fb7 instanceof String)
                ? '*'
                : _0x2a3fb7
            }
            function _0x2cc68e(_0xe3bf08) {
              return (
                (_0xe3bf08 = _0xe3bf08()),
                _0x49bea3.p(_0xe3bf08) ? _0xe3bf08[_0x49bea3.t] : _0xe3bf08
              )
            }
            function _0x1e59d8(_0x2f572f) {
              var _0x4cef98 = this['__cpOriginalData']
              return _0x49bea3.p(_0x4cef98)
                ? _0x4cef98[_0x49bea3.i]
                : this.source && this.source.location
                ? ((_0x4cef98 = this.source.location.href),
                  (_0x4cef98 = _0x1134a5.Uri.create(_0x4cef98).l()),
                  new _0x1134a5.URI(_0x4cef98).origin())
                : _0x2f572f()
            }
            if ('MessageEvent' in _0x2851b3) {
              try {
                _0x1134a5.v(
                  _0x2851b3.MessageEvent.prototype,
                  'data',
                  _0x2cc68e,
                  function () {}
                )
              } catch (_0x4f83fc) {
                _0x1134a5.g(_0x4f83fc)
              }
              try {
                _0x1134a5.v(
                  _0x2851b3.MessageEvent.prototype,
                  'origin',
                  _0x1e59d8,
                  function () {}
                )
              } catch (_0x41d8b2) {
                _0x1134a5.g(_0x41d8b2)
              }
            }
            if ('ExtendableMessageEvent' in _0x2851b3) {
              try {
                _0x1134a5.v(
                  _0x2851b3.ExtendableMessageEvent.prototype,
                  'data',
                  _0x2cc68e,
                  function () {}
                )
              } catch (_0x27f41f) {
                _0x1134a5.g(_0x27f41f)
              }
              try {
                _0x1134a5.v(
                  _0x2851b3.ExtendableMessageEvent.prototype,
                  'origin',
                  _0x1e59d8,
                  function () {}
                )
              } catch (_0x503aa8) {
                _0x1134a5.g(_0x503aa8)
              }
            }
            return this
          }
          ['p'](_0x380da0) {
            return !!(
              _0x380da0 &&
              'object' == typeof _0x380da0 &&
              this.t in _0x380da0 &&
              this.i in _0x380da0
            )
          }
          ['h'](_0x3067f1) {
            if (_0x3067f1) {
              if (this.p(_0x3067f1)) {
                return _0x3067f1[this.t]
              }
              if (_0x2851b3.Array.isArray(_0x3067f1)) {
                for (
                  var _0x1a64c2 = 0;
                  _0x1a64c2 < _0x3067f1.length;
                  _0x1a64c2++
                ) {
                  this.p(_0x3067f1[_0x1a64c2])
                    ? (_0x3067f1[_0x1a64c2] = _0x3067f1[_0x1a64c2][this.t])
                    : this.h(_0x3067f1[_0x1a64c2])
                }
              } else {
                if ('object' == typeof _0x3067f1) {
                  for (var _0x41423e in _0x3067f1)
                    this.p(_0x3067f1[_0x41423e])
                      ? (_0x3067f1[_0x41423e] = _0x3067f1[_0x41423e][this.t])
                      : this.h(_0x3067f1[_0x41423e])
                }
              }
            }
            return _0x3067f1
          }
        }),
        this
      )
  }

  initCacheOverride (_0x8a50f3, _0x52f0a8) {
      return (
        (this.CacheOverride = class {
          static ['create']() {
            return new this()
          }
          ['o']() {
            return (
              'Cache' in _0x8a50f3 &&
                (this.F().R().C().A()['$']()['_']().m(),
                _0x52f0a8.U('Cache proxy methods attached!')),
              this
            )
          }
          ['F']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'add',
                (_0x81ecc6, _0x46afde) => (
                  (_0x46afde[0] = _0x52f0a8.Uri.create(_0x46afde[0]).S()),
                  _0x81ecc6(_0x46afde)
                ),
                true,
                true
              )
            } catch (_0x5f40c8) {
              _0x52f0a8.g(_0x5f40c8)
            }
            return this
          }
          ['R']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'addAll',
                (_0x55ca33, _0x24ba89) => {
                  for (
                    let _0x138fc7 = 0;
                    _0x138fc7 < _0x24ba89.length;
                    _0x138fc7++
                  ) {
                    _0x24ba89[_0x138fc7] = _0x52f0a8.Uri.create(
                      _0x24ba89[_0x138fc7]
                    ).S()
                  }
                  return _0x55ca33(_0x24ba89)
                },
                true,
                true
              )
            } catch (_0x4ac204) {
              _0x52f0a8.g(_0x4ac204)
            }
            return this
          }
          ['C']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'delete',
                (_0x43aaa1, _0x295e6c, _0x23199a) => (
                  (_0x295e6c[0] = _0x52f0a8.Uri.create(_0x295e6c[0]).S()),
                  _0x43aaa1(_0x295e6c)
                )
              )
            } catch (_0x9cb348) {
              _0x52f0a8.g(_0x9cb348)
            }
            return this
          }
          ['A']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'keys',
                (_0xc8f24a, _0x439543) => _0xc8f24a(_0x439543)
              )
            } catch (_0x35657c) {
              _0x52f0a8.g(_0x35657c)
            }
            return this
          }
          ['$']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'match',
                (_0x2b4503, _0x351ead) => (
                  (_0x351ead[0] = _0x52f0a8.Uri.create(_0x351ead[0]).S()),
                  _0x2b4503(_0x351ead)
                )
              )
            } catch (_0x32e63b) {
              _0x52f0a8.g(_0x32e63b)
            }
            return this
          }
          ['_']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'matchAll',
                (_0x256a00, _0x5f58c7) => {
                  for (
                    let _0x499200 = 0;
                    _0x499200 < _0x5f58c7.length;
                    _0x499200++
                  ) {
                    _0x5f58c7[_0x499200] = _0x52f0a8.Uri.create(
                      _0x5f58c7[_0x499200]
                    ).S()
                  }
                  return _0x256a00(_0x5f58c7)
                }
              )
            } catch (_0x373666) {
              _0x52f0a8.g(_0x373666)
            }
            return this
          }
          ['m']() {
            try {
              _0x52f0a8.B(
                _0x8a50f3.Cache.prototype,
                'put',
                (_0x51f240, _0x2c7d22) => (
                  (_0x2c7d22[0] = _0x52f0a8.Uri.create(_0x2c7d22[0]).S()),
                  _0x51f240(_0x2c7d22)
                )
              )
            } catch (_0xc26642) {
              _0x52f0a8.g(_0xc26642)
            }
            return this
          }
        }),
        this
      )
  }

  initCpn () {
    var $this: __Cpn = this;

    this.P = '__cp');
    this.I = '__cpp');
    this.D = '__cpOriginal');
    this.T = '__cpOriginalValueOf');
    this.j = '__cpo');
    this.O = '__cpc');
    this.k = '/__cpi.php');
    this.L = 'cp');
    this.Z = 'property');
    this.N = 'attribute');
    this.H = '__cpGenerated');
    this.M = '__cpLocation');
    this.W = new Array();
    this.q = new Array('#__cpsHeaderZapper', '#__cpsFooter');
    
    // Patch URI.
    var originalURItoString = URI.prototype.toString;
    URI.prototype.valueOf = URI.prototype.toString = function () {
      return originalURItoString.call(this).replace(/##$/, '#');
    }

    var originalURI = URI;
    URI = function (url: string, base: string) {
      var _0x427051
      try {
        _0x427051 = new URL(url)
      } catch (_0x26be7e) {}
      return (
        url &&
          _0x427051 &&
          (!_0x427051.protocol ||
            _0x427051.protocol.match(/^(http|https)/i)) &&
          ((url = url.replace(
            /(^[a-z]*:?)\/{3,}/i,
            '$1//'
          )).match(/(%[^0-9a-f%])|(%$)/i) &&
            ($this.K('Invalid url ' + url + ' fixed'),
            (url = encodeURI(url))),
          url.match(/#$/)) &&
          (url += '#'),
        originalURI(url, base)
      )
    }
      
    this.J = function () {
      if ('permalink' in this && this.permalink) {
        return this.permalink
      }
      this.Y('No permalink defined for this window')
    }

    // Always in debug mode.
    /** Whether we're in debug mode or no. */
    this.tt = function () {
      return true;
    }

    this.U = function (msg: unknown) {
      console.log('[CP]', msg);
      return this;
    }

    this.K = function (err: unknown) {
      var _0x4827bc
      
      if (this.tt()) {
        _0x4827bc = '[CP ' + $window.location.href + ']';

        if (err instanceof Error) {
          console.warn(_0x4827bc, err.message);
          err.stack && console.warn(err.stack);
        }
        else {
          console.warn(_0x4827bc, err)
        }
      }

      return this;
    }

    this.g = function (err: unknown) {
      return this.K(err)
    }
    
    this.Y = function (error_msg: string) {
      throw new Error('[CP Error] ' + error_msg)
    }

    this.nt = function (err: Error, prefix = '') {
      this.K((prefix ? prefix + '; ' : '') + err.message);
      return this;
    }

    // Should always be true in ServiceWorker.
    this.rt = function () {
      return true;
    }

    this.it = uppercaseFirstLetter;
    
    /** Generates unique hash for a given string. */
    this.ot = function (str: string) {
      var _0x6f744d,
        _0x162151 = 0
      if (0 === str.length) {
        return _0x162151
      }
      for (_0x6f744d = 0; _0x6f744d < str.length; _0x6f744d++) {
        _0x162151 =
          (_0x162151 << 5) - _0x162151 + str.charCodeAt(_0x6f744d)
        _0x162151 |= 0
      }
      return Math.abs(_0x162151)
    }

    this.ht = uppercaseFirstLetterOfSecondString;

    /** Patch request builder. */
    this.ut = function (original_req: Request, _0x40cdf1 = null) {
      return original_req
        .clone()
        .text()
        .then((body) => {
          var _0x269bae = '',
            _0x5984cd = original_req.url
          try {
            _0x5984cd = new Uri(_0x5984cd).S(
              new Object(),
              _0x40cdf1
            )
          } catch (err: Error) {
            this.K(err.message + ' (url)')
          }
          try {
            original_req.referrer &&
              '1' !==
                (_0x49c12a = this.Uri.create(original_req.referrer)).at() &&
              (_0x269bae = _0x49c12a.S(new Object(), _0x40cdf1))
          } catch (_0x13f8d9) {
            this.K(_0x13f8d9.message + ' (referrer)')
          }
          var _0x49c12a = new Request(
            _0x5984cd,
            new Object({
              method: original_req.method,
              headers: new Headers(original_req.headers),
              mode: 'cors',
              credentials: 'include',
              cache: 'default',
              redirect: original_req.redirect,
              referrer: _0x269bae,
              body:
                'GET' !== original_req.method &&
                'HEAD' !== original_req.method &&
                body
                  ? body
                  : void 0,
            })
          )
          return Promise.resolve(_0x49c12a)
        })
    }
    
    this.B = function (
      _0x55fba8,
      _0x44b3fc,
      _0x1a56be,
      _0x5dce13 = true,
      _0x3386ae = false,
      _0x3698eb = false
    ) {
      'object' != typeof _0x55fba8 &&
        'function' != typeof _0x55fba8 &&
        this.Y('No object to replace method ' + _0x44b3fc)
      var _0x478512 = _0x55fba8[_0x44b3fc],
        _0x5dce13 =
          ('function' != typeof _0x478512 &&
            this.Y(
              'No method ' +
                _0x44b3fc +
                ' defined in object ' +
                _0x55fba8.constructor.name
            ),
          _0x5dce13 &&
            ((_0x5dce13 = function () {
              return _0x3698eb
                ? new _0x478512(...arguments)
                : _0x478512.apply(this, arguments)
            }),
            _0x3386ae && (_0x5dce13 = _0x5dce13.bind(_0x55fba8)),
            (_0x55fba8[this.ht(this.D, _0x44b3fc)] = _0x5dce13)),
          function () {
            return _0x1a56be.call(
              this,
              (_0x31b340) =>
                _0x3698eb
                  ? new _0x478512(..._0x31b340)
                  : _0x478512.apply(this, _0x31b340),
              Array.from(arguments)
            )
          })
      return (
        _0x3386ae && (_0x5dce13 = _0x5dce13.bind(_0x55fba8)),
        (_0x55fba8[_0x44b3fc] = _0x5dce13),
        (_0x55fba8['__cpn'] = this)
      )
    }

    this.v = function (
      _0x4088ab,
      _0x5afe65,
      _0x59e831,
      _0x15fa3f,
      _0x13d350 = true,
      _0x1faeee = false
    ) {
      if (_0x4088ab instanceof Array) {
        var _0xbda21f,
          _0x15fb44 = _0x4088ab
        _0x4088ab = new Object()
        for (_0xbda21f of _0x15fb44)
          if (_0x5afe65 in _0xbda21f) {
            _0x4088ab = _0xbda21f
            break
          }
      }
      'object' != typeof _0x4088ab &&
        this.Y('No object to replace property ' + _0x5afe65)
      _0x5afe65 in _0x4088ab ||
        this.Y(
          'No property ' +
            _0x5afe65 +
            ' defined in object ' +
            _0x4088ab.constructor.name
        )
      var _0x4ad0b0,
        _0x5136be,
        _0x323645,
        _0x46e6d8,
        _0x451f76,
        _0x71882b,
        _0x15fb44 = Object.getOwnPropertyDescriptor(
          _0x4088ab,
          _0x5afe65
        ),
        _0x556c38 =
          ((_0x15fb44 && _0x15fb44.configurable) ||
            this.Y(
              'No configurable descriptor for object ' +
                _0x4088ab.constructor.name +
                ', property ' +
                _0x5afe65
            ),
          (_0x4d2dcb, _0x31fd4b, _0x138abe) => (
            (_0x4d2dcb[_0x31fd4b] = _0x138abe),
            this.et(_0x4d2dcb) &&
              _0x4d2dcb.setAttribute(_0x31fd4b, _0x138abe),
            this
          ))
      return (
        (_0x4ad0b0 = _0x15fb44),
        (_0x5136be = this),
        Object.defineProperty(
          _0x4088ab,
          _0x5afe65,
          new Object({
            set: function (_0xd5e286) {
              _0x556c38(this, _0x5136be.ht(_0x5136be.T, _0x5afe65), _0xd5e286)
              _0x15fa3f.call(
                this,
                (_0x2370f9) => {
                  _0x4ad0b0.set.call(this, _0x2370f9)
                },
                _0xd5e286,
                _0x5136be.Z
              )
            },
            get: function () {
              return _0x59e831.call(
                this,
                () => _0x4ad0b0.get.call(this),
                _0x5136be.Z
              )
            },
            configurable: true,
            enumerable: true,
          })
        ),
        _0x13d350 &&
          Object.defineProperty(
            _0x4088ab,
            this.ht(this.D, _0x5afe65),
            new Object({
              set: function (_0x8fd44a) {
                _0x4ad0b0.set.call(this, _0x8fd44a)
              },
              get: function () {
                return _0x4ad0b0.get.call(this)
              },
              configurable: _0x1faeee,
              enumerable: false,
            })
          ),
        (_0x5afe65 = _0x5afe65.toLowerCase()),
        'Element' in $window &&
          _0x4088ab instanceof $window.Element &&
          'function' == typeof _0x4088ab.getAttribute &&
          ((_0x4088ab.setAttribute =
            ((_0x451f76 = _0x4088ab.setAttribute),
            (_0x71882b = this),
            function (_0x24f946, _0x4a1458) {
              var _0x4d64a1 = _0x24f946.toLowerCase()
              _0x4d64a1 === _0x5afe65
                ? (_0x556c38(
                    this,
                    _0x71882b.ht(_0x71882b.T, _0x5afe65),
                    _0x4a1458
                  ),
                  _0x15fa3f.call(
                    this,
                    (_0xe43708) => {
                      _0x451f76.call(this, _0x5afe65, _0xe43708)
                    },
                    _0x4a1458,
                    _0x71882b.N
                  ))
                : (_0x13d350 &&
                    _0x4d64a1 === _0x71882b.D.toLowerCase() + _0x5afe65 &&
                    (_0x24f946 = _0x5afe65),
                  _0x451f76.call(this, _0x24f946, _0x4a1458))
            })),
          (_0x4088ab.getAttribute =
            ((_0x323645 = _0x4088ab.getAttribute),
            (_0x46e6d8 = this),
            function (_0x17e375) {
              var _0x2aa9b1 = _0x17e375.toLowerCase()
              return _0x2aa9b1 === _0x5afe65
                ? _0x59e831.call(
                    this,
                    () => _0x323645.call(this, _0x5afe65),
                    _0x46e6d8.N
                  )
                : (_0x13d350 &&
                    _0x2aa9b1 === _0x46e6d8.D.toLowerCase() + _0x5afe65 &&
                    (_0x17e375 = _0x5afe65),
                  _0x323645.call(this, _0x17e375))
            }))),
        (_0x4088ab['__cpn'] = this)
      )
    }

    /** UNIX timestamp ? */
    this.ct = function () {
      return (
        Math.floor(Date.now() / 1000) +
        '.' +
        Math.floor(10000000000 * Math.random())
      )
    }
    
    this.dt = function (_0x23692b) {
      return encodeURIComponent(B64.encode(_0x23692b))
    }
    
    this.lt = function (_0x2745df) {
      return decodeURIComponent(B64.decode(_0x2745df))
    }
    
    this.wt = function (_0x904b39) {
      return _0x904b39.isTrusted
    }

    this.gt = function (_0x19f1ce) {
      return _0x19f1ce[Math.floor(Math.random() * _0x19f1ce.length)]
    }

    this.bt = function (_0x7564f9 = null) {
      let _0x41b8ae
      return _0x7564f9
        ? ((_0x41b8ae = this.URI(_0x7564f9)).origin(this.X),
          _0x41b8ae.toString())
        : '/' ===
          (_0x41b8ae =
            this.X + this.URI($window.location.href).directory()).slice(-1)
        ? _0x41b8ae
        : _0x41b8ae + '/'
    }

    return this;
  }

  initUri (_0xbcb22f, _0x102661) {
      return (
        (this.Uri = class {
          static ['create'](_0x2ff351, _0x5c80f1 = false) {
            return new this(_0x2ff351, _0x5c80f1)
          }
          constructor(_0x525d16, _0x5012d6 = false) {
            this.uri = null
            ;((!_0x5012d6 && null != _0x525d16) || (_0x5012d6 && _0x525d16)) &&
              (this.uri = _0x102661.URI((_0x525d16 += '')))
            this.url = _0x525d16
          }
          ['Bt']() {
            return !(
              !this.uri ||
              (this.uri.protocol() &&
                'http' !== this.uri.protocol() &&
                'https' !== this.uri.protocol())
            )
          }
          ['Pt']() {
            return !(
              !this.uri ||
              !this.url ||
              _0x102661.W.every(
                (_0x5da4a4) => !this.url.match(new _0xbcb22f.RegExp(_0x5da4a4))
              )
            )
          }
          ['Et'](_0x2852f0 = false) {
            return (
              !this.Bt() ||
              this.Pt() ||
              (this.uri.hasSearch(_0x102661.j) &&
                (!_0x2852f0 || ('1' !== this.at() && _0x2852f0)))
            )
          }
          ['It']() {
            return !(!this.url || !this.url.match(/^blob:/i))
          }
          ['at']() {
            return this.Bt() ? this.uri.query(true)[_0x102661.j] : null
          }
          ['Dt']() {
            return (
              _0x102661.X +
              _0x102661.k +
              '?r=' +
              _0x102661.B64.encode(this.url) +
              '&' +
              _0x102661.j +
              '=1'
            )
          }
          ['S'](_0x189d04 = new _0xbcb22f.Object(), _0xdf78a2 = null) {
            if (this.Et()) {
              return this.url
            }
            try {
              ;(_0x323ca7 = this.uri.clone()).origin() &&
                _0x102661.URI(_0x323ca7.origin()).equals(_0x102661.X) &&
                _0x323ca7.origin('')
              ;((_0x323ca7 = (_0xdf78a2 = _0xdf78a2 || _0x102661.u.Ft())
                ? _0x323ca7.absoluteTo(_0xdf78a2)
                : _0x323ca7).protocol() &&
                _0x323ca7.hostname()) ||
                _0x102661.Y(
                  'No origin for url ' +
                    this.url +
                    ', possible result is ' +
                    _0x323ca7
                )
              var _0x3b9dc0,
                _0x4373af = btoa(_0x323ca7.origin()).replace(/=+$/g, '')
              for (_0x3b9dc0 in ((_0x323ca7 = this.Tt(
                _0x323ca7.origin(_0x102661.X),
                _0x102661.j,
                _0x4373af
              )),
              _0x189d04))
                var _0x50c871 = _0x189d04[_0x3b9dc0],
                  _0x323ca7 = this.Tt(
                    _0x323ca7,
                    _0x102661.L + ':' + _0x3b9dc0,
                    _0x50c871
                  )
              return _0x323ca7.toString()
            } catch (_0x28b479) {
              return (
                _0x102661.K(
                  this.url +
                    ': ' +
                    _0x28b479.message +
                    '; base url: ' +
                    (_0xdf78a2 || '-')
                ),
                this.url
              )
            }
          }
          ['l']() {
            var _0x4cd2da = this.at()
            if (!_0x4cd2da || '1' === _0x4cd2da) {
              return this.url
            }
            try {
              var _0x3bc70c = atob(_0x4cd2da)
            } catch (_0x264a14) {
              return (
                _0x102661.nt(
                  _0x264a14,
                  'Wrong CPO hash supplied, url: ' + this.url
                ),
                this.url
              )
            }
            var _0x528e26,
              _0x1aab9c = this.uri.clone().removeSearch(_0x102661.j)
            for (_0x528e26 in _0x1aab9c.query(true))
              _0x528e26.match(
                new _0xbcb22f.RegExp('^' + _0x102661.L + ':', 'i')
              ) && _0x1aab9c.removeSearch(_0x528e26)
            return _0x1aab9c
              .origin(_0x3bc70c)
              .toString()
              .replace(_0x102661.M, 'location')
              .trim()
          }
          ['Tt'](_0x290d5b, _0x4b200a, _0x16b721) {
            return (
              (_0x4b200a =
                _0xbcb22f.encodeURIComponent(_0x4b200a) +
                '=' +
                _0xbcb22f.encodeURIComponent(_0x16b721)),
              (_0x4b200a = (_0x290d5b.search() ? '&' : '?') + _0x4b200a),
              _0x290d5b.search(_0x290d5b.search() + _0x4b200a)
            )
          }
        }),
        this
      )
  }

  initWorker ($self, $this) {
      return (
        (this.Worker = class extends this.Scope {
          static ['create']() {
            return new this()
          }
          ['o']() {
            if (
              !$self[$this.I] &&
              (($self[$this.I] = '1'),
              $this.CacheOverride.create().o(),
              $this.PostedMessageOverride.create().o(),
              this.Ot().X().jt().xt()['_t']()['$t'](),
              'ServiceWorkerGlobalScope' in $self)
            ) {
              this.Ht().Nt().Zt().Lt().kt().zt()
              try {
                this.At(window.Client.prototype, 'url', true)
              } catch (_0x2a2fb5) {
                $this.g(_0x2a2fb5)
              }
            }
            return this
          }
          ['Ot']() {
            return (
              window.Object.defineProperty(
                window,
                $this.M,
                new window.Object({
                  get: function () {
                    return $this.u
                  },
                  configurable: false,
                  enumerable: true,
                })
              ),
              this
            )
          }
          ['jt']() {
            function _0x5b4bcb(_0x499953) {
              if ((_0x499953 = _0x499953())) {
                try {
                  $this.v(
                    _0x499953,
                    'scriptURL',
                    function () {
                      return this['__cpn'].u.href
                    },
                    function () {}
                  )
                } catch (_0xb81e9e) {
                  $this.g(_0xb81e9e)
                }
              }
              return _0x499953
            }
            try {
              $this.v(
                window.ServiceWorkerRegistration.prototype,
                'active',
                _0x5b4bcb,
                function () {}
              )
            } catch (_0x1a88cd) {
              $this.g(_0x1a88cd)
            }
            try {
              $this.v(
                window.ServiceWorkerRegistration.prototype,
                'installing',
                _0x5b4bcb,
                function () {}
              )
            } catch (_0x8911cd) {
              $this.g(_0x8911cd)
            }
            try {
              $this.v(
                window.ServiceWorkerRegistration.prototype,
                'waiting',
                _0x5b4bcb,
                function () {}
              )
            } catch (_0x5075f4) {
              $this.g(_0x5075f4)
            }
            return this
          }
          ['Ht']() {
            try {
              $this.B(
                $self.WindowClient.prototype,
                'navigate',
                function (_0x3a8df1, _0x3c7adf) {
                  return (
                    (_0x3c7adf[0] = this['__cpn'].Uri.create(_0x3c7adf[0]).S()),
                    _0x3a8df1(_0x3c7adf)
                  )
                }
              )
            } catch (_0x598750) {
              $this.g(_0x598750)
            }
            return this
          }
          ['Nt']() {
            try {
              $this.B(
                $self.Clients.prototype,
                'openWindow',
                function (_0x3be0f4, _0x5a0689) {
                  return (
                    (_0x5a0689[0] = this['__cpn'].Uri.create(_0x5a0689[0]).S()),
                    _0x3be0f4(_0x5a0689)
                  )
                }
              )
            } catch (_0x3d181e) {
              $this.g(_0x3d181e)
            }
            return this
          }
          ['Lt']() {
            try {
              $this.B($self.Clients.prototype, 'claim', function () {
                return this['__cpn'].V.Promise.resolve()
              })
            } catch (_0x4d07b5) {
              $this.g(_0x4d07b5)
            }
            return this
          }
          ['Zt']() {
            try {
              $this.B($self, 'skipWaiting', function () {
                return this['__cpn'].V.Promise.resolve()
              })
            } catch (_0x418adc) {
              $this.g(_0x418adc)
            }
            return this
          }
          ['kt']() {
            try {
              $this.B(
                $self,
                'importScripts',
                function (_0x4c2336, _0x404349) {
                  for (
                    var _0x19dc3b = 0;
                    _0x19dc3b < _0x404349.length;
                    _0x19dc3b++
                  ) {
                    _0x404349[_0x19dc3b] = this['__cpn'].Uri.create(
                      _0x404349[_0x19dc3b]
                    ).S()
                  }
                  return _0x4c2336(_0x404349)
                },
                true,
                true
              )
            } catch (_0x2284bb) {
              $this.g(_0x2284bb)
            }
            return this
          }
          ['zt']() {
            return (
              $self.addEventListener('install', (_0x16a66d) => {
                _0x16a66d.waitUntil($self['__cpOriginalSkipWaiting']())
                $this.U('install!')
              }),
              $self.addEventListener('activate', (_0xbf737) => {
                _0xbf737.waitUntil(
                  (async () => {
                    self.registration.navigationPreload &&
                      (await self.registration.navigationPreload.disable())
                    await $self.clients['__cpOriginalClaim']()
                    $this.U('activate!')
                  })()
                )
              }),
              $self.addEventListener(
                'fetch',
                (evt) => {
                  evt.stopPropagation()
                  evt.stopImmediatePropagation()
                  $this.Uri.create(evt.request.url).Et() ||
                    evt.respondWith(
                      (async () => {
                        var url = await $self.clients.get(
                          evt.clientId
                        )
                        let _0x48b92a = null
                        if (url) {
                          url = $this.Uri.create(url.url)
                          if ('1' === url.at()) {
                            return $self['__cpOriginalFetch'](
                              evt.request
                            )
                          }
                          _0x48b92a = $this.URI(url.l())
                        }
                        return (
                          (url = await $this.ut(
                            evt.request,
                            _0x48b92a
                          )),
                          $self['__cpOriginalFetch'](url)
                        )
                      })()
                    )
                },
                true
              ),
              this
            )
          }
        }),
        this
      )
  }
}

new __Cpn();
