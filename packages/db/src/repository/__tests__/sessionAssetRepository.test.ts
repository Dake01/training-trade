import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addSessionAsset,
  closeSession,
  createSession,
  listSessionAssets,
  systemSessionDeps,
} from "@training-trade/domain";
import type { SessionDeps } from "@training-trade/domain";
import { createDbClient, type DbClient } from "../../client";
import { createSqliteSessionRepository } from "../sessionRepository";
import { createSqliteSessionAssetRepository } from "../sessionAssetRepository";

/** Deterministic deps with a fixed clock and random ids. */
function depsAt(iso: string): SessionDeps {
  return {
    clock: { now: () => new Date(iso) },
    ids: { generate: () => crypto.randomUUID() },
  };
}

describe("createSqliteSessionAssetRepository (integration, in-memory SQLite)", () => {
  let client: DbClient;

  beforeEach(() => {
    client = createDbClient(":memory:");
  });

  afterEach(() => {
    client.close();
  });

  function openOneSession(): string {
    const sessionRepo = createSqliteSessionRepository(client);
    return createSession(sessionRepo, systemSessionDeps).id;
  }

  it("creates the assets and session_assets tables", () => {
    const tables = client.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(expect.arrayContaining(["assets", "session_assets"]));
  });

  it("links an asset and stores snake_case columns while exposing camelCase", () => {
    const sessionId = openOneSession();
    const repo = createSqliteSessionAssetRepository(client);

    const { asset } = addSessionAsset(repo, systemSessionDeps, sessionId, {
      symbol: "aapl",
      name: "Apple",
    });

    expect(asset.symbol).toBe("AAPL"); // normalised
    expect(asset.name).toBe("Apple");

    const assetRow = client.sqlite
      .prepare("SELECT * FROM assets WHERE id = ?")
      .get(asset.id) as Record<string, unknown>;
    expect(Object.keys(assetRow)).toEqual(
      expect.arrayContaining(["id", "symbol", "name", "created_at"]),
    );

    const linkRow = client.sqlite
      .prepare("SELECT * FROM session_assets WHERE asset_id = ?")
      .get(asset.id) as Record<string, unknown>;
    expect(Object.keys(linkRow)).toEqual(
      expect.arrayContaining(["session_id", "asset_id", "linked_at"]),
    );
  });

  it("enforces a unique catalogue symbol (reused, not duplicated)", () => {
    const sessionId = openOneSession();
    const repo = createSqliteSessionAssetRepository(client);

    const first = addSessionAsset(repo, systemSessionDeps, sessionId, {
      symbol: "AAPL",
    });
    // Same symbol, different case: idempotent, no duplicate catalogue row.
    const second = addSessionAsset(repo, systemSessionDeps, sessionId, {
      symbol: "aapl",
    });
    expect(second.asset.id).toBe(first.asset.id);
    expect(second.created).toBe(false);

    const count = client.sqlite
      .prepare("SELECT COUNT(*) AS n FROM assets")
      .get() as { n: number };
    expect(count.n).toBe(1);
  });

  it("does not create duplicate links for the same (session, asset)", () => {
    const sessionId = openOneSession();
    const repo = createSqliteSessionAssetRepository(client);

    addSessionAsset(repo, systemSessionDeps, sessionId, { symbol: "AAPL" });
    addSessionAsset(repo, systemSessionDeps, sessionId, { symbol: "AAPL" });

    const count = client.sqlite
      .prepare("SELECT COUNT(*) AS n FROM session_assets")
      .get() as { n: number };
    expect(count.n).toBe(1);
  });

  it("returns the existing asset when insert loses a symbol race", () => {
    const repo = createSqliteSessionAssetRepository(client);

    repo.transaction((store) => {
      const first = store.insertAsset({
        id: "asset-1",
        symbol: "AAPL",
        name: null,
        createdAt: "2026-06-09T08:00:00.000Z",
      });
      const raced = store.insertAsset({
        id: "asset-2",
        symbol: "AAPL",
        name: "Apple",
        createdAt: "2026-06-09T08:01:00.000Z",
      });

      expect(first.id).toBe("asset-1");
      expect(raced).toEqual(first);
    });
  });

  it("returns the existing link when insert loses a link race", () => {
    const sessionId = openOneSession();
    const repo = createSqliteSessionAssetRepository(client);

    repo.transaction((store) => {
      const asset = store.insertAsset({
        id: "asset-1",
        symbol: "AAPL",
        name: null,
        createdAt: "2026-06-09T08:00:00.000Z",
      });
      const first = store.insertLink({
        sessionId,
        assetId: asset.id,
        linkedAt: "2026-06-09T08:00:00.000Z",
      });
      const raced = store.insertLink({
        sessionId,
        assetId: asset.id,
        linkedAt: "2026-06-09T08:01:00.000Z",
      });

      expect(raced).toEqual(first);
    });
  });

  it("rejects a link pointing at an unknown session (foreign key)", () => {
    // Create one asset via a valid session first.
    const sessionId = openOneSession();
    const repo = createSqliteSessionAssetRepository(client);
    const { asset } = addSessionAsset(repo, systemSessionDeps, sessionId, {
      symbol: "AAPL",
    });

    expect(() =>
      client.sqlite
        .prepare(
          "INSERT INTO session_assets (session_id, asset_id, linked_at) VALUES (?, ?, ?)",
        )
        .run("ghost-session", asset.id, "2026-06-09T08:00:00.000Z"),
    ).toThrow();
  });

  it("lists linked assets ordered by linkedAt then symbol", () => {
    const sessionId = openOneSession();
    const repo = createSqliteSessionAssetRepository(client);

    // Controlled clocks so linkedAt is distinct and the ordering is deterministic.
    addSessionAsset(repo, depsAt("2026-06-09T10:00:00.000Z"), sessionId, {
      symbol: "MSFT",
    });
    addSessionAsset(repo, depsAt("2026-06-09T09:00:00.000Z"), sessionId, {
      symbol: "AAPL",
    });

    const symbols = listSessionAssets(repo, sessionId).map((a) => a.symbol);
    // AAPL linked earlier (09:00) so it comes first despite being added second.
    expect(symbols).toEqual(["AAPL", "MSFT"]);
  });

  it("keeps existing links consultable after the session is closed", () => {
    const sessionRepo = createSqliteSessionRepository(client);
    const session = createSession(sessionRepo, systemSessionDeps);
    const repo = createSqliteSessionAssetRepository(client);

    addSessionAsset(repo, systemSessionDeps, session.id, { symbol: "AAPL" });
    closeSession(sessionRepo, systemSessionDeps, session.id);

    const symbols = listSessionAssets(repo, session.id).map((a) => a.symbol);
    expect(symbols).toEqual(["AAPL"]);
  });
});
