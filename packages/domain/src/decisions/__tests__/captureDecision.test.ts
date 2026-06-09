import { describe, expect, it } from "vitest";
import {
  SessionNotActiveError,
  SessionNotFoundError,
} from "../../sessions/errors";
import { fixedDeps } from "../../sessions/__tests__/fakeRepo";
import { captureDecision } from "../captureDecision";
import { AssetNotInSessionError } from "../errors";
import {
  createFakeDecisionRepository,
  link,
  openSession,
} from "./fakeDecisionRepo";

const input = {
  assetId: "asset-1",
  side: "buy" as const,
  quantity: "10",
  referencePrice: "123.45",
};

describe("captureDecision", () => {
  it("records a decision on an open session with a linked asset", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1")],
      [link("s-1", "asset-1")],
    );

    const decision = captureDecision(repo, fixedDeps(), "s-1", {
      ...input,
      logicalTimestamp: "2026-06-09T09:00:00.000Z",
    });

    expect(decision.id).toBe("id-1");
    expect(decision.sessionId).toBe("s-1");
    expect(decision.assetId).toBe("asset-1");
    expect(decision.side).toBe("buy");
    expect(decision.quantity).toBe("10");
    expect(decision.referencePrice).toBe("123.45");
    expect(decision.logicalTimestamp).toBe("2026-06-09T09:00:00.000Z");
    expect(decision.createdAt).toBe("2026-06-08T14:00:00.000Z");
  });

  it("defaults the logical timestamp to the capture instant when omitted", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1")],
      [link("s-1", "asset-1")],
    );

    const decision = captureDecision(
      repo,
      fixedDeps({ iso: "2026-06-09T12:00:00.000Z" }),
      "s-1",
      input,
    );

    expect(decision.logicalTimestamp).toBe("2026-06-09T12:00:00.000Z");
    expect(decision.createdAt).toBe("2026-06-09T12:00:00.000Z");
  });

  it("is append-only: identical submissions create distinct events", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1")],
      [link("s-1", "asset-1")],
    );

    const first = captureDecision(repo, fixedDeps({ ids: ["id-1"] }), "s-1", input);
    const second = captureDecision(repo, fixedDeps({ ids: ["id-2"] }), "s-1", input);

    expect(first.id).not.toBe(second.id);
    expect(countDecisions(repo, "s-1")).toBe(2);
  });

  it("refuses an unknown session", () => {
    const repo = createFakeDecisionRepository([], []);
    expect(() =>
      captureDecision(repo, fixedDeps(), "missing", input),
    ).toThrow(SessionNotFoundError);
  });

  it.each(["closed", "suspended"] as const)(
    "refuses capturing on a %s session",
    (status) => {
      const repo = createFakeDecisionRepository(
        [{ ...openSession("s-1"), status }],
        [link("s-1", "asset-1")],
      );
      expect(() =>
        captureDecision(repo, fixedDeps(), "s-1", input),
      ).toThrow(SessionNotActiveError);
    },
  );

  it("refuses an asset that is not linked to the session", () => {
    const repo = createFakeDecisionRepository([openSession("s-1")], []);
    expect(() =>
      captureDecision(repo, fixedDeps(), "s-1", input),
    ).toThrow(AssetNotInSessionError);
  });

  it("refuses an asset linked to another session only", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1"), openSession("s-2")],
      [link("s-2", "asset-1")],
    );
    expect(() =>
      captureDecision(repo, fixedDeps(), "s-1", input),
    ).toThrow(AssetNotInSessionError);
  });
});

function countDecisions(
  repo: ReturnType<typeof createFakeDecisionRepository>,
  sessionId: string,
): number {
  return repo.transaction((store) => store.listBySessionId(sessionId).length);
}
