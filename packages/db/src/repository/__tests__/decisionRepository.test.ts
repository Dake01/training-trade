import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addSessionAsset,
  captureDecision,
  closeSession,
  createSession,
  listSessionDecisions,
  systemSessionDeps,
} from "@training-trade/domain";
import type { SessionDeps } from "@training-trade/domain";
import { createDbClient, type DbClient } from "../../client";
import { createSqliteSessionRepository } from "../sessionRepository";
import { createSqliteSessionAssetRepository } from "../sessionAssetRepository";
import { createSqliteDecisionRepository } from "../decisionRepository";

/** Deterministic deps with a controlled clock and random ids. */
function depsAt(iso: string): SessionDeps {
  return {
    clock: { now: () => new Date(iso) },
    ids: { generate: () => crypto.randomUUID() },
  };
}

describe("createSqliteDecisionRepository (integration, in-memory SQLite)", () => {
  let client: DbClient;

  beforeEach(() => {
    client = createDbClient(":memory:");
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

  it("creates the decisions table", () => {
    const tables = client.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(expect.arrayContaining(["decisions"]));
  });

  it("stores snake_case columns while exposing camelCase", () => {
    const { sessionId, assetId } = openSessionWithAsset();
    const repo = createSqliteDecisionRepository(client);

    const decision = captureDecision(repo, systemSessionDeps, sessionId, {
      assetId,
      side: "buy",
      quantity: "10",
      referencePrice: "123.45",
      logicalTimestamp: "2026-06-09T09:00:00.000Z",
    });

    const row = client.sqlite
      .prepare("SELECT * FROM decisions WHERE id = ?")
      .get(decision.id) as Record<string, unknown>;
    expect(Object.keys(row)).toEqual(
      expect.arrayContaining([
        "id",
        "session_id",
        "asset_id",
        "side",
        "quantity",
        "reference_price",
        "logical_timestamp",
        "created_at",
      ]),
    );
  });

  it("persists money and quantity values exactly as decimal text", () => {
    const { sessionId, assetId } = openSessionWithAsset();
    const repo = createSqliteDecisionRepository(client);

    const decision = captureDecision(repo, systemSessionDeps, sessionId, {
      assetId,
      side: "sell",
      quantity: "0.000001",
      referencePrice: "19999.99",
    });

    const row = client.sqlite
      .prepare("SELECT quantity, reference_price FROM decisions WHERE id = ?")
      .get(decision.id) as { quantity: string; reference_price: string };
    // Stored as TEXT verbatim, no float coercion.
    expect(row.quantity).toBe("0.000001");
    expect(row.reference_price).toBe("19999.99");
    expect(typeof row.quantity).toBe("string");
  });

  it("appends a new event for every capture (no deduplication)", () => {
    const { sessionId, assetId } = openSessionWithAsset();
    const repo = createSqliteDecisionRepository(client);
    const input = {
      assetId,
      side: "buy" as const,
      quantity: "1",
      referencePrice: "100",
    };

    captureDecision(repo, systemSessionDeps, sessionId, input);
    captureDecision(repo, systemSessionDeps, sessionId, input);

    const count = client.sqlite
      .prepare("SELECT COUNT(*) AS n FROM decisions")
      .get() as { n: number };
    expect(count.n).toBe(2);
  });

  it("rejects a decision pointing at an unknown asset (foreign key)", () => {
    const sessionId = createSession(
      createSqliteSessionRepository(client),
      systemSessionDeps,
    ).id;

    expect(() =>
      client.sqlite
        .prepare(
          `INSERT INTO decisions
             (id, session_id, asset_id, side, quantity, reference_price, logical_timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "d-1",
          sessionId,
          "ghost-asset",
          "buy",
          "1",
          "100",
          "2026-06-09T09:00:00.000Z",
          "2026-06-09T09:00:00.000Z",
        ),
    ).toThrow();
  });

  it("lists decisions ordered by logicalTimestamp then createdAt then id", () => {
    const { sessionId, assetId } = openSessionWithAsset();
    const repo = createSqliteDecisionRepository(client);
    const base = {
      assetId,
      side: "buy" as const,
      quantity: "1",
      referencePrice: "100",
    };

    const third = captureDecision(repo, depsAt("2026-06-09T10:00:00.000Z"), sessionId, {
      ...base,
      logicalTimestamp: "2026-06-09T12:00:00.000Z",
    });
    const first = captureDecision(repo, depsAt("2026-06-09T10:01:00.000Z"), sessionId, {
      ...base,
      logicalTimestamp: "2026-06-09T09:00:00.000Z",
    });
    const second = captureDecision(repo, depsAt("2026-06-09T10:02:00.000Z"), sessionId, {
      ...base,
      logicalTimestamp: "2026-06-09T11:00:00.000Z",
    });

    const ids = listSessionDecisions(repo, sessionId).map((d) => d.id);
    expect(ids).toEqual([first.id, second.id, third.id]);
  });

  it("keeps decisions consultable after the session is closed", () => {
    const sessionRepo = createSqliteSessionRepository(client);
    const { sessionId, assetId } = openSessionWithAsset();
    const repo = createSqliteDecisionRepository(client);

    captureDecision(repo, systemSessionDeps, sessionId, {
      assetId,
      side: "buy",
      quantity: "1",
      referencePrice: "100",
    });
    closeSession(sessionRepo, systemSessionDeps, sessionId);

    expect(listSessionDecisions(repo, sessionId)).toHaveLength(1);
  });
});
