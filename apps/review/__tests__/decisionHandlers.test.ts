import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDbClient,
  createSqliteDecisionAmendmentRepository,
  createSqliteDecisionRepository,
  createSqliteSessionAssetRepository,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import {
  addSessionAsset,
  closeSession,
  createSession,
  systemSessionDeps,
  type DecisionAmendmentRepository,
  type DecisionRepository,
} from "@training-trade/domain";
import {
  handleCaptureDecision,
  handleListSessionDecisions,
} from "../src/server/decisionHandlers";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/sessions/x/decisions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("decision API handlers (integration over SQLite)", () => {
  let client: DbClient;
  let repo: DecisionRepository;
  // Listing goes through the amendment-aware repository so the effective
  // decision (latest comment + applied correction/cancellation) is returned.
  let listRepo: DecisionAmendmentRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    repo = createSqliteDecisionRepository(client);
    listRepo = createSqliteDecisionAmendmentRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  /** Open a session and link one asset, returning both ids. */
  function openSessionWithAsset(): { sessionId: string; assetId: string } {
    const sessionId = createSession(
      createSqliteSessionRepository(client),
      systemSessionDeps,
    ).id;
    const { asset } = addSessionAsset(
      createSqliteSessionAssetRepository(client),
      systemSessionDeps,
      sessionId,
      { symbol: "AAPL" },
    );
    return { sessionId, assetId: asset.id };
  }

  function capturePayload(assetId: string, overrides: Record<string, unknown> = {}) {
    return {
      assetId,
      side: "buy",
      quantity: "10",
      referencePrice: "123.45",
      ...overrides,
    };
  }

  it("POST captures a decision and returns 201 with the camelCase DTO", async () => {
    const { sessionId, assetId } = openSessionWithAsset();

    const response = await handleCaptureDecision(
      repo,
      sessionId,
      postRequest(capturePayload(assetId, {
        logicalTimestamp: "2026-06-09T09:00:00.000Z",
      })),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
    expect(body.data.decision).toMatchObject({
      sessionId,
      assetId,
      side: "buy",
      quantity: "10",
      referencePrice: "123.45",
      logicalTimestamp: "2026-06-09T09:00:00.000Z",
    });
    expect(typeof body.data.decision.id).toBe("string");
    expect(typeof body.data.decision.createdAt).toBe("string");
    // No snake_case leaks into the API payload.
    expect(Object.keys(body.data.decision)).not.toContain("reference_price");
    expect(Object.keys(body.data.decision)).not.toContain("logical_timestamp");
  });

  it("POST is append-only: two identical submissions create two events", async () => {
    const { sessionId, assetId } = openSessionWithAsset();

    await handleCaptureDecision(repo, sessionId, postRequest(capturePayload(assetId)));
    await handleCaptureDecision(repo, sessionId, postRequest(capturePayload(assetId)));

    const list = await handleListSessionDecisions(listRepo, sessionId).json();
    expect(list.data.decisions).toHaveLength(2);
    expect(list.data.timeline).toHaveLength(2);
  });

  it("GET returns an empty list for a session without decisions", async () => {
    const { sessionId } = openSessionWithAsset();
    const body = await handleListSessionDecisions(listRepo, sessionId).json();
    expect(body.data.decisions).toEqual([]);
    expect(body.data.timeline).toEqual([]);
  });

  it("POST returns a structured 400 for an invalid payload", async () => {
    const { sessionId, assetId } = openSessionWithAsset();

    const response = await handleCaptureDecision(
      repo,
      sessionId,
      postRequest(capturePayload(assetId, { quantity: "0" })),
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns a structured 400 when the body is not JSON", async () => {
    const { sessionId } = openSessionWithAsset();
    const bad = new Request("http://localhost/api/sessions/x/decisions", {
      method: "POST",
      body: "not-json",
    });

    const response = await handleCaptureDecision(repo, sessionId, bad);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns a structured 404 for an unknown session", async () => {
    const response = await handleCaptureDecision(
      repo,
      "missing",
      postRequest(capturePayload("any-asset")),
    );
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "SESSION_NOT_FOUND",
      message: "Session introuvable.",
      status: 404,
    });
  });

  it("POST returns a structured 409 when the session is not active", async () => {
    const { sessionId, assetId } = openSessionWithAsset();
    closeSession(createSqliteSessionRepository(client), systemSessionDeps, sessionId);

    const response = await handleCaptureDecision(
      repo,
      sessionId,
      postRequest(capturePayload(assetId)),
    );
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "SESSION_NOT_ACTIVE",
      message: "La session n'est pas active.",
      status: 409,
    });
  });

  it("POST returns a structured 409 when the asset is not linked to the session", async () => {
    const { sessionId } = openSessionWithAsset();

    const response = await handleCaptureDecision(
      repo,
      sessionId,
      postRequest(capturePayload("foreign-asset")),
    );
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "ASSET_NOT_IN_SESSION",
      message: "L'actif n'est pas associe a cette session.",
      status: 409,
    });
  });

  it("GET returns a structured 500 when storage fails", async () => {
    const failingRepo: DecisionAmendmentRepository = {
      transaction: () => {
        throw new Error("storage unavailable");
      },
    };

    const response = handleListSessionDecisions(failingRepo, "any");
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      status: 500,
    });
  });

  it("walks the full vertical slice: open -> link asset -> capture -> ordered replay -> close -> still consultable", async () => {
    const sessionRepo = createSqliteSessionRepository(client);
    const { sessionId, assetId } = openSessionWithAsset();

    // Capture two decisions out of logical order.
    expect(
      (
        await handleCaptureDecision(
          repo,
          sessionId,
          postRequest(capturePayload(assetId, {
            side: "buy",
            logicalTimestamp: "2026-06-09T11:00:00.000Z",
          })),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await handleCaptureDecision(
          repo,
          sessionId,
          postRequest(capturePayload(assetId, {
            side: "sell",
            logicalTimestamp: "2026-06-09T09:00:00.000Z",
          })),
        )
      ).status,
    ).toBe(201);

    // Replay is ordered by logical timestamp (sell at 09:00 first).
    const listed = await handleListSessionDecisions(listRepo, sessionId).json();
    expect(listed.data.decisions.map((d: { side: string }) => d.side)).toEqual([
      "sell",
      "buy",
    ]);

    // Close the session.
    closeSession(sessionRepo, systemSessionDeps, sessionId);

    // Capturing on a closed session is refused (409), no new event persisted.
    const refused = await handleCaptureDecision(
      repo,
      sessionId,
      postRequest(capturePayload(assetId)),
    );
    expect(refused.status).toBe(409);

    // The history stays consultable and unchanged after close.
    const afterClose = await handleListSessionDecisions(listRepo, sessionId).json();
    expect(afterClose.data.decisions.map((d: { side: string }) => d.side)).toEqual([
      "sell",
      "buy",
    ]);
    expect(afterClose.data.timeline).toHaveLength(2);
  });
});
