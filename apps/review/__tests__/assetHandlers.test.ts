import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDbClient,
  createSqliteSessionAssetRepository,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import {
  closeSession,
  createSession,
  systemSessionDeps,
  type SessionAssetRepository,
} from "@training-trade/domain";
import {
  handleAddSessionAsset,
  handleListSessionAssets,
} from "../src/server/assetHandlers";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/sessions/x/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("asset API handlers (integration over SQLite)", () => {
  let client: DbClient;
  let repo: SessionAssetRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    repo = createSqliteSessionAssetRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  function openSessionId(): string {
    return createSession(createSqliteSessionRepository(client), systemSessionDeps)
      .id;
  }

  it("POST attaches an asset and returns 201 with the camelCase DTO", async () => {
    const id = openSessionId();

    const response = await handleAddSessionAsset(
      repo,
      id,
      postRequest({ symbol: "nasdaq:aapl", name: "Apple" }),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
    expect(body.data.asset).toMatchObject({
      symbol: "NASDAQ:AAPL",
      name: "Apple",
    });
    expect(typeof body.data.asset.id).toBe("string");
    expect(typeof body.data.asset.linkedAt).toBe("string");
    // No snake_case leaks into the API payload.
    expect(Object.keys(body.data.asset)).not.toContain("created_at");
    expect(Object.keys(body.data.asset)).not.toContain("linked_at");
  });

  it("POST is idempotent and returns 200 on a repeated add", async () => {
    const id = openSessionId();
    await handleAddSessionAsset(repo, id, postRequest({ symbol: "AAPL" }));

    const response = await handleAddSessionAsset(
      repo,
      id,
      postRequest({ symbol: "aapl" }),
    );
    expect(response.status).toBe(200);

    const list = await handleListSessionAssets(repo, id).json();
    expect(list.data.assets).toHaveLength(1);
  });

  it("GET returns every linked asset of the session", async () => {
    const id = openSessionId();
    await handleAddSessionAsset(repo, id, postRequest({ symbol: "MSFT" }));
    await handleAddSessionAsset(repo, id, postRequest({ symbol: "AAPL" }));

    const response = handleListSessionAssets(repo, id);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    // Ordering is proven deterministically in the domain/DB tests; here we only
    // assert both linked assets are returned via the API envelope.
    const symbols = body.data.assets.map((a: { symbol: string }) => a.symbol);
    expect(symbols).toHaveLength(2);
    expect(symbols).toEqual(expect.arrayContaining(["AAPL", "MSFT"]));
  });

  it("GET returns an empty list for a session without assets", async () => {
    const id = openSessionId();
    const body = await handleListSessionAssets(repo, id).json();
    expect(body.data.assets).toEqual([]);
  });

  it("POST returns a structured 400 for an invalid payload", async () => {
    const id = openSessionId();

    const response = await handleAddSessionAsset(
      repo,
      id,
      postRequest({ symbol: "" }),
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns a structured 400 when the body is not JSON", async () => {
    const id = openSessionId();
    const bad = new Request("http://localhost/api/sessions/x/assets", {
      method: "POST",
      body: "not-json",
    });

    const response = await handleAddSessionAsset(repo, id, bad);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns a structured 404 for an unknown session", async () => {
    const response = await handleAddSessionAsset(
      repo,
      "missing",
      postRequest({ symbol: "AAPL" }),
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
    const sessionRepo = createSqliteSessionRepository(client);
    const session = createSession(sessionRepo, systemSessionDeps);
    closeSession(sessionRepo, systemSessionDeps, session.id);

    const response = await handleAddSessionAsset(
      repo,
      session.id,
      postRequest({ symbol: "AAPL" }),
    );
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "SESSION_NOT_ACTIVE",
      message: "La session n'est pas active.",
      status: 409,
    });
  });

  it("GET still lists assets after the session is closed", async () => {
    const sessionRepo = createSqliteSessionRepository(client);
    const session = createSession(sessionRepo, systemSessionDeps);
    await handleAddSessionAsset(repo, session.id, postRequest({ symbol: "AAPL" }));
    closeSession(sessionRepo, systemSessionDeps, session.id);

    const body = await handleListSessionAssets(repo, session.id).json();
    expect(body.data.assets.map((a: { symbol: string }) => a.symbol)).toEqual([
      "AAPL",
    ]);
  });

  it("walks the full vertical slice: open -> add 2 -> list -> close -> refuse -> still list", async () => {
    const sessionRepo = createSqliteSessionRepository(client);
    const session = createSession(sessionRepo, systemSessionDeps);

    // Add two assets.
    expect(
      (await handleAddSessionAsset(repo, session.id, postRequest({ symbol: "AAPL" })))
        .status,
    ).toBe(201);
    expect(
      (await handleAddSessionAsset(repo, session.id, postRequest({ symbol: "MSFT" })))
        .status,
    ).toBe(201);

    // List shows both.
    const listed = await handleListSessionAssets(repo, session.id).json();
    expect(
      listed.data.assets.map((a: { symbol: string }) => a.symbol).sort(),
    ).toEqual(["AAPL", "MSFT"]);

    // Close the session.
    closeSession(sessionRepo, systemSessionDeps, session.id);

    // Adding to a closed session is refused (409), no new asset persisted.
    const refused = await handleAddSessionAsset(
      repo,
      session.id,
      postRequest({ symbol: "TSLA" }),
    );
    expect(refused.status).toBe(409);

    // The existing list stays consultable and unchanged.
    const afterClose = await handleListSessionAssets(repo, session.id).json();
    expect(
      afterClose.data.assets.map((a: { symbol: string }) => a.symbol).sort(),
    ).toEqual(["AAPL", "MSFT"]);
  });

  it("GET returns a structured 500 when storage fails", async () => {
    const failingRepo: SessionAssetRepository = {
      transaction: () => {
        throw new Error("storage unavailable");
      },
    };

    const response = handleListSessionAssets(failingRepo, "any");
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      status: 500,
    });
  });
});
