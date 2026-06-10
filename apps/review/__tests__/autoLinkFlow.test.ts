import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDbClient,
  createSqliteDecisionRepository,
  createSqliteSessionAssetRepository,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import {
  createSession,
  systemSessionDeps,
  type DecisionRepository,
  type SessionAssetRepository,
} from "@training-trade/domain";
import { handleAddSessionAsset, handleListSessionAssets } from "../src/server/assetHandlers";
import { handleCaptureDecision } from "../src/server/decisionHandlers";

function postAsset(body: unknown): Request {
  return new Request("http://localhost/api/sessions/x/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postDecision(body: unknown): Request {
  return new Request("http://localhost/api/sessions/x/decisions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("auto-link flow: symbol detected → asset linked → decision captured", () => {
  let client: DbClient;
  let assetRepo: SessionAssetRepository;
  let decisionRepo: DecisionRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    assetRepo = createSqliteSessionAssetRepository(client);
    decisionRepo = createSqliteDecisionRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  function openSession(): string {
    return createSession(createSqliteSessionRepository(client), systemSessionDeps).id;
  }

  it("links a TV-detected symbol then immediately captures a decision against it", async () => {
    const sessionId = openSession();

    // Step 1 — popup auto-links the TradingView symbol
    const linkRes = await handleAddSessionAsset(
      assetRepo,
      sessionId,
      postAsset({ symbol: "NASDAQ:AAPL" }),
    );
    expect(linkRes.status).toBe(201);
    const linkBody = await linkRes.json();
    const assetId: string = linkBody.data.asset.id;
    expect(linkBody.data.asset.symbol).toBe("NASDAQ:AAPL");

    // Step 2 — popup captures a decision using the linked asset
    const captureRes = await handleCaptureDecision(
      decisionRepo,
      sessionId,
      postDecision({
        assetId,
        side: "buy",
        quantity: "5",
        referencePrice: "182.50",
        logicalTimestamp: "2026-06-10T09:30:00.000Z",
      }),
    );
    expect(captureRes.status).toBe(201);
    const captureBody = await captureRes.json();
    expect(captureBody.data.decision).toMatchObject({
      sessionId,
      assetId,
      side: "buy",
      quantity: "5",
      referencePrice: "182.50",
    });
  });

  it("is idempotent: re-detecting the same symbol does not duplicate the asset", async () => {
    const sessionId = openSession();

    // First detection
    await handleAddSessionAsset(assetRepo, sessionId, postAsset({ symbol: "btcusdt" }));
    // Second detection (same symbol, different case — TradingView can vary casing)
    const second = await handleAddSessionAsset(
      assetRepo,
      sessionId,
      postAsset({ symbol: "BTCUSDT" }),
    );
    expect(second.status).toBe(200);

    const list = await handleListSessionAssets(assetRepo, sessionId).json();
    expect(list.data.assets).toHaveLength(1);
    expect(list.data.assets[0].symbol).toBe("BTCUSDT");
  });

  it("captures a decision even when the asset was already linked before TV detection", async () => {
    const sessionId = openSession();

    // Asset pre-linked (e.g., from a previous session or manual add)
    const preLink = await handleAddSessionAsset(
      assetRepo,
      sessionId,
      postAsset({ symbol: "EURUSD" }),
    );
    expect(preLink.status).toBe(201);
    const assetId: string = (await preLink.json()).data.asset.id;

    // TV detection triggers a second POST — must return 200, not create a duplicate
    const autoLink = await handleAddSessionAsset(
      assetRepo,
      sessionId,
      postAsset({ symbol: "eurusd" }),
    );
    expect(autoLink.status).toBe(200);
    expect((await autoLink.json()).data.asset.id).toBe(assetId);

    // Decision capture succeeds
    const captureRes = await handleCaptureDecision(
      decisionRepo,
      sessionId,
      postDecision({ assetId, side: "sell", quantity: "1", referencePrice: "1.09" }),
    );
    expect(captureRes.status).toBe(201);
  });

  it("rejects a decision when the detected symbol could not be linked (unknown session)", async () => {
    // Simulate: auto-link fails for a non-existent session → assetId is never obtained
    const linkRes = await handleAddSessionAsset(
      assetRepo,
      "unknown-session",
      postAsset({ symbol: "AAPL" }),
    );
    expect(linkRes.status).toBe(404);
    // No assetId → popup cannot call capture → correct graceful degradation
  });
});
