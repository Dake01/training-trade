const LOCAL_REVIEW_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function getAllowedCorsOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin.startsWith("chrome-extension://")) return origin;
  if (LOCAL_REVIEW_ORIGINS.has(origin)) return origin;
  return null;
}

export function buildCorsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  const allowedOrigin = getAllowedCorsOrigin(origin);
  if (!allowedOrigin) return headers;

  headers.set("access-control-allow-origin", allowedOrigin);
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "Origin");
  return headers;
}

export function applyCorsHeaders(response: Response, request: Request): Response {
  const headers = buildCorsHeaders(request.headers.get("origin"));
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export function corsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}
