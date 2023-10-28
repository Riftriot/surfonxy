import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";

import {
  createProxiedResponse,
  createSession,
  
  makeProxyWebSocketHandler, type ProxyWebSocketElysiaHandler
} from "../src";

const WEBSOCKET_BASE_PATH = "/__surfonxy_websocket__";
const CONSTANT_SESSION = createSession();

const proxy = new Elysia();
proxy.ws(WEBSOCKET_BASE_PATH + "/*", makeProxyWebSocketHandler(WEBSOCKET_BASE_PATH) as ProxyWebSocketElysiaHandler);
proxy.all("*", ({ request }) => {
  return createProxiedResponse(request, CONSTANT_SESSION, {
    WEBSOCKET_PROXY_PATH: WEBSOCKET_BASE_PATH
  });
});

proxy.listen({
  tls: {
    key: Bun.file("./surfonxy.dev-key.pem"),
    cert: Bun.file("./surfonxy.dev.pem"),
  },
    
  port: 443,
  hostname: "surfonxy.dev"
}, (server) => {
  console.info(`[elysia]: Running on https://${server.hostname}`);
});

const tests = new Elysia()
// Deploy the `tests` folder on the root of that server.
  .use(staticPlugin({
    prefix: "/"  
  }));

tests.listen(8080);