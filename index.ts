import { Elysia, type Context } from "elysia";
import type { WebSocketHandler } from "bun";

import { createProxiedResponse, createSession, makeProxyWebSocketHandler } from "./src";
const session = createSession();

const WEBSOCKET_BASE_PATH = "/__surfonxy_websocket__";

new Elysia()
  .ws(WEBSOCKET_BASE_PATH + "/*", makeProxyWebSocketHandler(WEBSOCKET_BASE_PATH) as Omit<Partial<WebSocketHandler<Context>>, "publish" | "open" | "message" | "close" | "drain" | "publishToSelf">)
  .all("*", ({ request }) => {
    return createProxiedResponse(request, session, {
      WEBSOCKET_PROXY_PATH: WEBSOCKET_BASE_PATH
    });
  })
  .listen({
    tls: {
      key: Bun.file("./surfonxy.dev-key.pem"),
      cert: Bun.file("./surfonxy.dev.pem"),
    },
    
    port: 443,
    hostname: "surfonxy.dev"
  }, (server) => {
    console.info(`[elysia]: Running on https://${server.hostname}`);
  });
