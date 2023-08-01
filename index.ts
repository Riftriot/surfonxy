import { Elysia } from "elysia";
import { cookie } from '@elysiajs/cookie'

import { sessions, Session, createProxiedResponse, createSession } from "./src";

const AUTH_COOKIE_NAME = "__surfskip_token";
const SESSION_ID_COOKIE_NAME = "__surfskip_session_id";

let workerContentCache: string | undefined;

new Elysia()
  .use(cookie())
  .get("/surfonxy.js", async ({ set }) => {
    set.headers["content-type"] = "text/javascript";

    if (!workerContentCache) {
      const result = await Bun.build({
        entrypoints: [Bun.fileURLToPath(new URL("./src/client/worker.ts", import.meta.url))],
        target: "browser",
        minify: true
      });
  
      workerContentCache = await result.outputs[0].text();
    }

    return workerContentCache;
  })
  // TODO: remove after done.
  .get("/__surfonxy_auth", ({ setCookie }) => {
    setCookie(AUTH_COOKIE_NAME, "123456789");
    setCookie(SESSION_ID_COOKIE_NAME, "e651c4bb-6a0f-402c-83f0-a8233135f3d9");

    return "ok";
  })
  /** `:url` should be encoded in `base64`. */
  .all("*", ({ cookie, set, request, query }) => {
    const authorization = cookie[AUTH_COOKIE_NAME];
    const session_id = cookie[SESSION_ID_COOKIE_NAME];

    if (!authorization) {
      set.status = 401;
      return {
        message: "Not authenticated, you should proceed to an authentication check before accessing the proxy."
      }
    }

    let session = sessions[session_id];
    if (!session) {
      // TODO: remove after debug
      session = new Session(authorization, session_id);
      sessions[session_id] = session;
      // set.status = 404;
      // return {
      //   code: 3,
      //   message: "This session doesn't exist, please generate a new one."
      // }
    }

    if (!session.auth_tokens.includes(authorization)) {
      set.status = 403;
      return {
        code: 4,
        message: "You're not authorized to access this session."
      }
    }

    const origin = atob(query.__surfonxy_url as string);
    const url = new URL(origin);
    url.pathname = new URL(request.url).pathname;
    url.search = new URL(request.url).search;

    return createProxiedResponse(url.href, session, request);
  })
  .listen(8000, () => {
    console.info("running on port 8000.");
  });
