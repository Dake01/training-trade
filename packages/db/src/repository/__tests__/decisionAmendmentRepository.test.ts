import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addSessionAsset,
  addDecisionComment,
  cancelDecision,
  captureDecision,
  closeSession,
  correctDecision,
  createSession,
  listDecisionTimeline,
  systemSessionDeps,
} from "@training-trade/domain";
import { DecisionNotAmendableError } from "@training-trade/domain";
import { createDbClient, type DbClient } from "../../client";
import { createSqliteSessionRepository } from "../sessionRepository";
import { createSqliteSessionAssetRepository } from "../sessionAssetRepository";
import { createSqliteDecisionRepository } from "../decisionRepository";
import { createSqliteDecisionAmendmentRepository } from "../decisionAmendmentRepository";

describe("createSqliteDecisionAmendmentRepository (integration, in-memory SQLite)", () => {
  let client: DbClient;

  beforeEach(() => {
    client = createDbClient(":memory:");
  });

  afterEach(() => {
    client.close();
  });

  /** Open a session, link an asset and capture one decision. */
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

  it("creates the decision_amendments table", () => {
    const tables = client.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(expect.arrayContaining(["decision_amendments"]));
  });

  it("persists a comment and exposes it on the effective decision", () => {
    const { sessionId, decisionId } = setup();
    const repo = createSqliteDecisionAmendmentRepository(client);

    addDecisionComment(repo, systemSessionDeps, sessionId, decisionId, {
      comment: "Contexte de saisie",
    });

    const timeline = listDecisionTimeline(repo, sessionId);
    expect(timeline[0]?.decision.comment).toBe("Contexte de saisie");
    expect(timeline[0]?.amendments).toHaveLength(1);
  });

  it("persists a correction with exact decimal replacement values", () => {
    const { sessionId, decisionId, otherAssetId } = setup();
    const repo = createSqliteDecisionAmendmentRepository(client);

    const corrected = correctDecision(repo, systemSessionDeps, sessionId, decisionId, {
      reason: "Quantite trop faible",
      replacement: {
        assetId: otherAssetId,
        side: "sell",
        quantity: "12.5",
        referencePrice: "100.10",
      },
    });

    expect(corrected).toMatchObject({
      assetId: otherAssetId,
      side: "sell",
      quantity: "12.5",
      referencePrice: "100.10",
      revisionStatus: "corrected",
    });

    // Re-read independently to prove the exact value round-trips.
    const reread = listDecisionTimeline(repo, sessionId)[0]?.decision;
    expect(reread?.quantity).toBe("12.5");
    expect(reread?.referencePrice).toBe("100.10");
  });

  it("keeps the foreign keys intact and refuses an unknown replacement asset", () => {
    const { sessionId, decisionId } = setup();
    const repo = createSqliteDecisionAmendmentRepository(client);
    expect(() =>
      correctDecision(repo, systemSessionDeps, sessionId, decisionId, {
        replacement: {
          assetId: "foreign",
          side: "buy",
          quantity: "1",
          referencePrice: "1",
        },
      }),
    ).toThrow();
  });

  it("cancellation is terminal and persisted", () => {
    const { sessionId, decisionId } = setup();
    const repo = createSqliteDecisionAmendmentRepository(client);

    cancelDecision(repo, systemSessionDeps, sessionId, decisionId, {
      reason: "Saisie accidentelle",
    });
    expect(() =>
      addDecisionComment(repo, systemSessionDeps, sessionId, decisionId, {
        comment: "trop tard",
      }),
    ).toThrow(DecisionNotAmendableError);

    expect(listDecisionTimeline(repo, sessionId)[0]?.decision.revisionStatus).toBe(
      "cancelled",
    );
  });

  it("reads the timeline in a stable order after several amendments", () => {
    const { sessionId, decisionId, otherAssetId } = setup();
    const repo = createSqliteDecisionAmendmentRepository(client);

    addDecisionComment(repo, systemSessionDeps, sessionId, decisionId, {
      comment: "Note 1",
    });
    correctDecision(repo, systemSessionDeps, sessionId, decisionId, {
      replacement: {
        assetId: otherAssetId,
        side: "sell",
        quantity: "12",
        referencePrice: "100.10",
      },
    });
    addDecisionComment(repo, systemSessionDeps, sessionId, decisionId, {
      comment: "Note 2",
    });

    const entry = listDecisionTimeline(repo, sessionId)[0];
    expect(entry?.amendments.map((a) => a.kind)).toEqual([
      "comment",
      "correction",
      "comment",
    ]);
    // Latest comment wins on the effective decision.
    expect(entry?.decision.comment).toBe("Note 2");
  });

  it("keeps amendments consultable after the session is closed", () => {
    const { sessionId, decisionId } = setup();
    const repo = createSqliteDecisionAmendmentRepository(client);

    addDecisionComment(repo, systemSessionDeps, sessionId, decisionId, {
      comment: "Avant cloture",
    });
    closeSession(createSqliteSessionRepository(client), systemSessionDeps, sessionId);

    // Read-only history still available after close.
    const timeline = listDecisionTimeline(repo, sessionId);
    expect(timeline[0]?.decision.comment).toBe("Avant cloture");
    // No new amendment accepted on a closed session.
    expect(() =>
      addDecisionComment(repo, systemSessionDeps, sessionId, decisionId, {
        comment: "Apres cloture",
      }),
    ).toThrow();
  });
});
