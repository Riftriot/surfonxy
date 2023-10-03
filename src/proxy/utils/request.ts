// Rewrite the request URL because some web servers don't like
// append 80 while using HTTPS (eg. elysia)
export const getRequestURL = (request: Request): URL => {
  const url = new URL(request.url);

  if (url.protocol === "https:") {
    // Remove the port from the URL,
    // that is useless for HTTPS, since default.
    url.port = "";
  }
  else if (url.protocol === "http:") {
    // Remove the port from the URL,
    // that is useless for HTTP, since default.
    if (url.port === "80") {
      url.port = "";
    }
  }

  return url;
};
