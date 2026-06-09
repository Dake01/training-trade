import { describe, expect, it } from "vitest";
import {
  applyCorsHeaders,
  buildCorsHeaders,
  corsPreflightResponse,
  getAllowedCorsOrigin,
} from "../src/server/cors";

describe("API CORS helpers", () => {
  it("allows Chrome extension origins", () => {
    const origin = "chrome-extension://befdllllpgpifkggejehchgefopfcnfg";

    expect(getAllowedCorsOrigin(origin)).toBe(origin);

    const headers = buildCorsHeaders(origin);
    expect(headers.get("access-control-allow-origin")).toBe(origin);
    expect(headers.get("access-control-allow-methods")).toBe("GET,POST,OPTIONS");
    expect(headers.get("access-control-allow-headers")).toBe("content-type");
  });

  it("does not allow arbitrary web origins", () => {
    const headers = buildCorsHeaders("https://example.com");

    expect(getAllowedCorsOrigin("https://example.com")).toBeNull();
    expect(headers.get("access-control-allow-origin")).toBeNull();
  });

  it("builds a successful preflight response for extension requests", () => {
    const request = new Request("http://localhost:3000/api/sessions/active", {
      method: "OPTIONS",
      headers: {
        origin: "chrome-extension://befdllllpgpifkggejehchgefopfcnfg",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    const response = corsPreflightResponse(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "chrome-extension://befdllllpgpifkggejehchgefopfcnfg",
    );
  });

  it("can attach CORS headers to JSON responses", async () => {
    const request = new Request("http://localhost:3000/api/sessions/active", {
      headers: { origin: "chrome-extension://extension-id" },
    });
    const response = applyCorsHeaders(Response.json({ ok: true }), request);

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "chrome-extension://extension-id",
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
