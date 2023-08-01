import { Elysia } from "elysia";

import { createProxiedResponse, createSession } from "./src";

const session = createSession();
let workerContentCache: string | undefined;

new Elysia()
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
  /** `:url` should be encoded in `base64`. */
  .all("*", ({ request, query }) => {
    const origin = atob(query.__surfonxy_url as string);
    const url = new URL(origin);
    url.pathname = new URL(request.url).pathname;
    url.search = new URL(request.url).search;

    return createProxiedResponse(url.href, session, request);
  })
  .listen(8000, () => {
    console.info("running on port 8000.");
  });
