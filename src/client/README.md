# `/src/client`

Here contains the files that will be built for the clients.

These scripts are injected by the proxy in the proxied HTML.

## `worker.ts`

ServiceWorker needed to intercept requests such as images for example.
It'll rewrite the URLs to use our proxy instead.

## `script.ts`

Script injected in-line in every HTML pages.
It is done in the `tweakHTML` function in the proxy.

That script mainly edits the prototypes of HTML elements to rewrite getters/setters
for some attributes such as `src` for `<img>`, and so on...

## `first-load.ts`

Script that should be injected in the page asking for user to wait until service worker installation.

It, in fact, installs the service worker correctly and redirects the user
to the exact same page but with the additional `__surfonxy_ready=1` search parameter to prevent running through that page once again.
