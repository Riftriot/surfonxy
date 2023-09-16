# @surfskip/surfonxy

> Our experimental home made, [Bun](https://bun.sh) optimized, web proxy.
> Should replace `testcafe-hammerhead` in [SurfSkip](https://www.surfskip.com) when ready and tested.

## Installation

Since this package is mainly made for Bun, we recommend that you make sure to have the latest version of Bun installed.

```bash
# Install the package using `bun`.
bun add @surfskip/surfonxy
```

## How it works ?

Surfonxy uses web standards, so as entry it'll take a [`Request`](https://developer.mozilla.org/docs/Web/API/Request) and outputs a [`Response`](https://developer.mozilla.org/docs/Web/API/Response).

The web server creation should be done manually, we only provide the proxy and session functions.

## Usage with [Elysia](https://elysiajs.com/)

For now, Surfonxy only supports requests at root path of the web server.

So, for example, `/*` will work, but let's say `/proxy/*` won't work for now.
That's something that we've to look into.

```typescript
import { Elysia } from "elysia";
import { createSession, createProxiedResponse } from "@surfskip/surfonxy";

const ELYSIA_SERVER_PORT = 8000;
const session = createSession();

new Elysia()
  // Use the `all` method to receive every methods.
  // Use `/*` to capture every requests from root path.
  .all("/*", async ({ request }) => {
    // You can do whatever you want here.
    // ...

    // Finally, create the proxied response and send it back.
    return createProxiedResponse(request, session);
  })
  .listen(ELYSIA_SERVER_PORT, () => {
    console.info(`[elysia]: web server runs on port ${ELYSIA_SERVER_PORT}`);
  })
```

First, we create a session using `createSession()`, this is where is stored all the session's data, including cookies.

Then, we define the proxy endpoint, here it will be the root path, `/*`, for every methods, `all`.

Finally, we get the [`Request`](https://developer.mozilla.org/docs/Web/API/Request) from `request` and we pass both the `request` and `session` to our `createProxiedResponse`.

This will return us a [`Response`](https://developer.mozilla.org/docs/Web/API/Response) that can be returned in the handler.

## Methods used to proxy

We use different methods to proxy every requests that are done in the client.

### Monkey patching

Changes getters and setters for some attributes of HTML elements such as `img`, `script` to rewrite the URLs it is requesting.

Required also for XHR requests, beacons and, in the future, [WebSocket](https://developer.mozilla.org/docs/Web/API/WebSocket) and [EventSource](https://developer.mozilla.org/docs/Web/API/EventSource).

### Service Worker

This one is used to intercept every possible requests and rewrite the URL before sending it. That way, we're sure that every assets are requested to our proxy.

To make sure we register the service worker on the very beginning, we pre-install it by showing a placeholder page (that can be customizable in the future) that just installs the service worker. When it is installed, we simply redirect to client to the exact same URL but with a new search parameter `__surfonxy_ready=1` that tells to not serve the placeholder page.

### Server-side tweaking

We rewrite HTML documents when they're requested server-side. That way we can pre-update some URLs before the client even receives it.

It could be useful for times where monkey patching didn't worked for some odd reason.

We also tweak JS scripts, to rewrite every `location` to `__sf_location`. That allows to proxy the `window.location` property. Anyway, doing this it in this way is not recommended at all and can break existing code.

In the future, we should also use an AST to parse the JS code to rewrite usage of the `window.location` property to be rewritten to `window.__sf_location`.

## Development

| Command | Description |
| ------- | ----------- |
| `bun lint` | Lints the codebase using `eslint`. |
| `bun dev` | Runs a test elysia server on `localhost:8000`. |
