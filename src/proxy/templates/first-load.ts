let firstLoadScriptCache: string | undefined;
export const getFirstLoadDocument = async (session_id: string): Promise<string> => {
  if (!firstLoadScriptCache) {
    const result = await Bun.build({
      entrypoints: [
        Bun.fileURLToPath(new URL("../../client/first-load.ts", import.meta.url)),
      ],
      target: "browser",
      minify: false,
    });

    firstLoadScriptCache = await result.outputs[0].text();
  }

  const content = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <script>${firstLoadScriptCache.replace("<<SESSION_ID>>", session_id)}</script>
        <title>Loading...</title>
      </head>
      <body>
        <h1>Wait, the service-worker is loading !</h1>
        <p>You'll be automatically redirected to the proxied page when the worker has been activated.</p>
      </body>
    </html>
  `.trim();

  return content;
};
