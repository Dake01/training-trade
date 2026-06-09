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
  captureDecision,
  closeSession,
  createSession,
  systemSessionDeps,
  type DecisionAmendmentRepository,
} from "@training-trade/domain";
import {
  handleAmendDecision,
  handleListSessionDecisions,
} from "../src/server/decisionHandlers";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/sessions/x/decisions/y/amendments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("decision amendment API handlers (integration over SQLite)", () => {
  let client: DbClient;
  let repo: DecisionAmendmentRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    repo = createSqliteDecisionAmendmentRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  /** Open a session, link two assets and capture one decision. */
  function setup(): {
    sessionId: string;
    assetId: string;
    otherAssetId: string;
    decisionId: string;
  } {
    const sessionId = createSession(
      createSqliteSessionRepository(client),
      systemSessionDeps,
    ).id;
    const assetRepo = createSqliteSessionAssetRepository(client);
    const assetId = addSessionAsset(assetRepo, systemSessionDeps, sessionId, {
      symbol: "AAPL",
    }).asset.id;
    const otherAssetId = addSessionAsset(assetRepo, systemSessionDeps, sessionId, {
      symbol: "MSFT",
    }).asset.id;
    const decisionId = captureDecision(
      createSqliteDecisionRepository(client),
      systemSessionDeps,
      sessionId,
      { assetId, side: "buy", quantity: "10", referencePrice: "123.45" },
    ).id;
    return { sessionId, assetId, otherAssetId, decisionId };
  }

  it("POST comment returns 201 with the effective decision", async () => {
    const { sessionId, decisionId } = setup();
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "comment", comment: "Contexte de saisie" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.decision).toMatchObject({
      id: decisionId,
      comment: "Contexte de saisie",
      revisionStatus: "original",
    });
  });

  it("POST correction returns 201 with corrected, camelCase values", async () => {
    const { sessionId, decisionId, otherAssetId } = setup();
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({
        kind: "correction",
        reason: "Quantite trop faible",
        replacement: {
          assetId: otherAssetId,
          side: "sell",
          quantity: "12",
          referencePrice: "100.10",
        },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.decision).toMatchObject({
      assetId: otherAssetId,
      side: "sell",
      quantity: "12",
      referencePrice: "100.10",
      revisionStatus: "corrected",
    });
    expect(Object.keys(body.data.decision)).not.toContain("reference_price");
  });

  it("POST cancellation returns 201 and marks the decision cancelled", async () => {
    const { sessionId, decisionId } = setup();
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "cancellation", reason: "Saisie accidentelle" }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).data.decision.revisionStatus).toBe("cancelled");
  });

  it("POST returns a structured 400 for an invalid payload", async () => {
    const { sessionId, decisionId } = setup();
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "comment", comment: "" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns a structured 400 when the body is not JSON", async () => {
    const { sessionId, decisionId } = setup();
    const bad = new Request("http://localhost/x", { method: "POST", body: "nope" });
    const res = await handleAmendDecision(repo, sessionId, decisionId, bad);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns 404 for an unknown decision", async () => {
    const { sessionId } = setup();
    const res = await handleAmendDecision(
      repo,
      sessionId,
      "missing",
      postRequest({ kind: "comment", comment: "x" }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("DECISION_NOT_FOUND");
  });

  it("POST returns 409 when the session is not active", async () => {
    const { sessionId, decisionId } = setup();
    closeSession(createSqliteSessionRepository(client), systemSessionDeps, sessionId);
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "comment", comment: "x" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("SESSION_NOT_ACTIVE");
  });

  it("POST returns 409 when correcting with an asset not in the session", async () => {
    const { sessionId, decisionId } = setup();
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({
        kind: "correction",
        replacement: {
          assetId: "foreign",
          side: "buy",
          quantity: "1",
          referencePrice: "1",
        },
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ASSET_NOT_IN_SESSION");
  });

  it("POST returns 409 when amending an already-cancelled decision", async () => {
    const { sessionId, decisionId } = setup();
    await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "cancellation" }),
    );
    const res = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "comment", comment: "trop tard" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("DECISION_NOT_AMENDABLE");
  });

  it("vertical slice: capture -> comment -> correct -> ordered replay -> close -> still consultable", async () => {
    const { sessionId, decisionId, otherAssetId } = setup();

    // Capture a second decision so ordering is exercised.
    const second = captureDecision(
      createSqliteDecisionRepository(client),
      { clock: { now: () => new Date("2026-06-09T08:00:00.000Z") }, ids: systemSessionDeps.ids },
      sessionId,
      {
        assetId: otherAssetId,
        side: "sell",
        quantity: "5",
        referencePrice: "10",
        logicalTimestamp: "2026-06-09T08:00:00.000Z",
      },
    );

    await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "comment", comment: "Note" }),
    );
    await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({
        kind: "correction",
        replacement: {
          assetId: otherAssetId,
          side: "sell",
          quantity: "12",
          referencePrice: "100.10",
        },
      }),
    );

    // Replay order: second decision (08:00) before the first (09:00).
    let listed = await handleListSessionDecisions(repo, sessionId).json();
    expect(listed.data.decisions.map((d: { id: string }) => d.id)).toEqual([
      second.id,
      decisionId,
    ]);
    const corrected = listed.data.decisions.find(
      (d: { id: string }) => d.id === decisionId,
    );
    expect(corrected).toMatchObject({
      comment: "Note",
      revisionStatus: "corrected",
      quantity: "12",
    });
    const amended = listed.data.timeline.find(
      (entry: { decision: { id: string } }) => entry.decision.id === decisionId,
    );
    expect(amended?.amendments).toHaveLength(2);
    expect(amended?.amendments[0].kind).toBe("comment");
    expect(amended?.amendments[1].kind).toBe("correction");

    // Close the session: history stays consultable, no new amendment accepted.
    closeSession(createSqliteSessionRepository(client), systemSessionDeps, sessionId);
    const refused = await handleAmendDecision(
      repo,
      sessionId,
      decisionId,
      postRequest({ kind: "comment", comment: "apres" }),
    );
    expect(refused.status).toBe(409);

    listed = await handleListSessionDecisions(repo, sessionId).json();
    const afterClose = listed.data.decisions.find(
      (d: { id: string }) => d.id === decisionId,
    );
    expect(afterClose).toMatchObject({ comment: "Note", revisionStatus: "corrected" });
  });
});
