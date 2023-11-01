import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";

import {
  createProxiedResponse,
  createSession,
  
  webSocketProxyHandler, type WebSocketElysiaProxyHandler,
  SURFONXY_WEBSOCKET_PATH_PREFIX
} from "../src";

const CONSTANT_SESSION = createSession();

const proxy = new Elysia();
proxy.ws(SURFONXY_WEBSOCKET_PATH_PREFIX + "/*", webSocketProxyHandler as WebSocketElysiaProxyHandler);
proxy.all("*", ({ request }) => {
  return createProxiedResponse(request, CONSTANT_SESSION);
});

proxy.listen({
  tls: {
    key: Bun.file("./surfonxy.dev-key.pem"),
    cert: Bun.file("./surfonxy.dev.pem"),
  },
    
  port: 443,
  hostname: "surfonxy.dev"
}, (server) => {
  console.info(`[proxy]: Running on https://${server.hostname}`);
})
  .listen(80, (server) => {
    console.info(`[proxy]: Running on http://${server.hostname}`);
  });

const tests = new Elysia();
tests.get("/", () => Bun.file("./public/index.html"));
// Deploy the `tests` folder on the root of that server.
tests.use(staticPlugin({
  prefix: "/"  
}));

tests.listen(8000, (server) => {
  console.info(`[tests]: Running on http://localhost:${server.port}`);
});