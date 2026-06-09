import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyCorsHeaders, corsPreflightResponse } from "./server/cors";

export function proxy(request: NextRequest): Response {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  return applyCorsHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: "/api/:path*",
};
