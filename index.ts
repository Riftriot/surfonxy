import { Elysia } from "elysia";

import { createProxiedResponse, createSession } from "./src";
const session = createSession();

new Elysia()
  /** `:url` should be encoded in `base64`. */
  .all("*", ({ request }) => {
    return createProxiedResponse(request, session);
  })
  .listen(8000, (server) => {
    console.info(`running on ${server.hostname}:${server.port}`);
  });
