import { describe, expect, it } from "vitest";
import {
  SessionNotActiveError,
  SessionNotFoundError,
} from "../../../sessions/errors";
import { fixedDeps } from "../../../sessions/__tests__/fakeRepo";
import { AssetNotInSessionError } from "../../errors";
import { addDecisionComment } from "../addDecisionComment";
import { cancelDecision } from "../cancelDecision";
import { correctDecision } from "../correctDecision";
import {
  DecisionNotAmendableError,
  DecisionNotFoundError,
} from "../errors";
import { listDecisionTimeline } from "../listDecisionTimeline";
import {
  createFakeAmendmentRepository,
  decision,
  link,
  openSession,
} from "./fakeAmendmentRepo";

function seededRepo() {
  return createFakeAmendmentRepository({
    sessions: [openSession("s-1")],
    links: [link("s-1", "asset-1"), link("s-1", "asset-2")],
    decisions: [decision("d-1", "s-1", "asset-1")],
  });
}

const replacement = {
  assetId: "asset-2",
  side: "sell" as const,
  quantity: "12",
  referencePrice: "100.10",
};

describe("addDecisionComment", () => {
  it("records a comment and returns the effective decision", () => {
    const repo = seededRepo();
    const result = addDecisionComment(repo, fixedDeps(), "s-1", "d-1", {
      comment: "Contexte de saisie",
    });
    expect(result.comment).toBe("Contexte de saisie");
    expect(result.revisionStatus).toBe("original");
  });

  it("keeps the latest comment when several are added", () => {
    const repo = seededRepo();
    addDecisionComment(repo, fixedDeps({ ids: ["a-1"], iso: "2026-06-09T09:10:00.000Z" }), "s-1", "d-1", {
      comment: "Premier",
    });
    const second = addDecisionComment(
      repo,
      fixedDeps({ ids: ["a-2"], iso: "2026-06-09T09:20:00.000Z" }),
      "s-1",
      "d-1",
      { comment: "Second" },
    );
    expect(second.comment).toBe("Second");
  });

  it("refuses an unknown session", () => {
    const repo = seededRepo();
    expect(() =>
      addDecisionComment(repo, fixedDeps(), "missing", "d-1", { comment: "x" }),
    ).toThrow(SessionNotFoundError);
  });

  it.each(["closed", "suspended"] as const)(
    "refuses amending on a %s session",
    (status) => {
      const repo = createFakeAmendmentRepository({
        sessions: [{ ...openSession("s-1"), status }],
        decisions: [decision("d-1", "s-1", "asset-1")],
      });
      expect(() =>
        addDecisionComment(repo, fixedDeps(), "s-1", "d-1", { comment: "x" }),
      ).toThrow(SessionNotActiveError);
    },
  );

  it("refuses an unknown decision", () => {
    const repo = seededRepo();
    expect(() =>
      addDecisionComment(repo, fixedDeps(), "s-1", "missing", { comment: "x" }),
    ).toThrow(DecisionNotFoundError);
  });

  it("refuses a decision that belongs to another session", () => {
    const repo = createFakeAmendmentRepository({
      sessions: [openSession("s-1"), openSession("s-2")],
      decisions: [decision("d-2", "s-2", "asset-1")],
    });
    expect(() =>
      addDecisionComment(repo, fixedDeps(), "s-1", "d-2", { comment: "x" }),
    ).toThrow(DecisionNotFoundError);
  });
});

describe("correctDecision", () => {
  it("applies the replacement to the effective decision", () => {
    const repo = seededRepo();
    const result = correctDecision(repo, fixedDeps(), "s-1", "d-1", {
      reason: "Quantite trop faible",
      replacement: { ...replacement, logicalTimestamp: "2026-06-09T10:00:00.000Z" },
    });
    expect(result).toMatchObject({
      assetId: "asset-2",
      side: "sell",
      quantity: "12",
      referencePrice: "100.10",
      logicalTimestamp: "2026-06-09T10:00:00.000Z",
      revisionStatus: "corrected",
    });
  });

  it("keeps the original logical timestamp when the correction omits it", () => {
    const repo = seededRepo();
    const result = correctDecision(repo, fixedDeps(), "s-1", "d-1", {
      replacement,
    });
    expect(result.logicalTimestamp).toBe("2026-06-09T09:00:00.000Z");
  });

  it("refuses a replacement asset not linked to the session", () => {
    const repo = seededRepo();
    expect(() =>
      correctDecision(repo, fixedDeps(), "s-1", "d-1", {
        replacement: { ...replacement, assetId: "foreign" },
      }),
    ).toThrow(AssetNotInSessionError);
  });
});

describe("cancelDecision", () => {
  it("marks the decision cancelled without destroying it", () => {
    const repo = seededRepo();
    const result = cancelDecision(repo, fixedDeps(), "s-1", "d-1", {
      reason: "Saisie accidentelle",
    });
    expect(result.revisionStatus).toBe("cancelled");
    expect(result.quantity).toBe("10");
  });

  it("is terminal: a cancelled decision refuses further amendments", () => {
    const repo = seededRepo();
    cancelDecision(repo, fixedDeps({ ids: ["a-1"] }), "s-1", "d-1");
    expect(() =>
      addDecisionComment(repo, fixedDeps({ ids: ["a-2"] }), "s-1", "d-1", {
        comment: "trop tard",
      }),
    ).toThrow(DecisionNotAmendableError);
    expect(() =>
      correctDecision(repo, fixedDeps({ ids: ["a-3"] }), "s-1", "d-1", {
        replacement,
      }),
    ).toThrow(DecisionNotAmendableError);
  });

  it("cancellation wins over a prior correction in the effective status", () => {
    const repo = seededRepo();
    correctDecision(repo, fixedDeps({ ids: ["a-1"], iso: "2026-06-09T09:10:00.000Z" }), "s-1", "d-1", {
      replacement,
    });
    const result = cancelDecision(
      repo,
      fixedDeps({ ids: ["a-2"], iso: "2026-06-09T09:20:00.000Z" }),
      "s-1",
      "d-1",
    );
    expect(result.revisionStatus).toBe("cancelled");
    // The corrected values are preserved (neutralised, not reverted).
    expect(result.quantity).toBe("12");
  });
});

describe("listDecisionTimeline", () => {
  it("refuses an unknown session", () => {
    const repo = seededRepo();
    expect(() => listDecisionTimeline(repo, "missing")).toThrow(
      SessionNotFoundError,
    );
  });

  it("returns effective decisions with their ordered amendment trail", () => {
    const repo = seededRepo();
    addDecisionComment(repo, fixedDeps({ ids: ["a-1"], iso: "2026-06-09T09:10:00.000Z" }), "s-1", "d-1", {
      comment: "Note",
    });
    correctDecision(repo, fixedDeps({ ids: ["a-2"], iso: "2026-06-09T09:20:00.000Z" }), "s-1", "d-1", {
      replacement,
    });

    const timeline = listDecisionTimeline(repo, "s-1");
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.decision).toMatchObject({
      comment: "Note",
      revisionStatus: "corrected",
      quantity: "12",
    });
    expect(timeline[0]?.amendments.map((a) => a.kind)).toEqual([
      "comment",
      "correction",
    ]);
  });

  it("keeps a stable replay order across decisions and corrections", () => {
    const repo = createFakeAmendmentRepository({
      sessions: [openSession("s-1")],
      links: [link("s-1", "asset-1")],
      decisions: [
        decision("d-late", "s-1", "asset-1", {
          logicalTimestamp: "2026-06-09T11:00:00.000Z",
        }),
        decision("d-early", "s-1", "asset-1", {
          logicalTimestamp: "2026-06-09T09:00:00.000Z",
        }),
      ],
    });

    const ids = listDecisionTimeline(repo, "s-1").map((e) => e.decision.id);
    expect(ids).toEqual(["d-early", "d-late"]);
  });

  it("reorders a decision when a correction changes its logical timestamp", () => {
    const repo = createFakeAmendmentRepository({
      sessions: [openSession("s-1")],
      links: [link("s-1", "asset-1")],
      decisions: [
        decision("d-a", "s-1", "asset-1", {
          logicalTimestamp: "2026-06-09T09:00:00.000Z",
        }),
        decision("d-b", "s-1", "asset-1", {
          logicalTimestamp: "2026-06-09T10:00:00.000Z",
        }),
      ],
    });

    // Push d-a after d-b by correcting its logical timestamp to 11:00.
    correctDecision(repo, fixedDeps({ ids: ["c-1"] }), "s-1", "d-a", {
      replacement: {
        assetId: "asset-1",
        side: "buy",
        quantity: "10",
        referencePrice: "123.45",
        logicalTimestamp: "2026-06-09T11:00:00.000Z",
      },
    });

    const ids = listDecisionTimeline(repo, "s-1").map((e) => e.decision.id);
    expect(ids).toEqual(["d-b", "d-a"]);
  });
});
