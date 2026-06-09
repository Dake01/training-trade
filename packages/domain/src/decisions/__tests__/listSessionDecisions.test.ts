import { describe, expect, it } from "vitest";
import { SessionNotFoundError } from "../../sessions/errors";
import { fixedDeps } from "../../sessions/__tests__/fakeRepo";
import { captureDecision } from "../captureDecision";
import { listSessionDecisions } from "../listSessionDecisions";
import {
  createFakeDecisionRepository,
  link,
  openSession,
} from "./fakeDecisionRepo";

function baseInput(assetId = "asset-1") {
  return {
    assetId,
    side: "buy" as const,
    quantity: "1",
    referencePrice: "100",
  };
}

describe("listSessionDecisions", () => {
  it("returns an empty list for a session with no decisions", () => {
    const repo = createFakeDecisionRepository([openSession("s-1")]);
    expect(listSessionDecisions(repo, "s-1")).toEqual([]);
  });

  it("orders decisions by logicalTimestamp, then createdAt, then id", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1")],
      [link("s-1", "asset-1")],
    );

    // Captured out of logical order; createdAt clock advances each call.
    captureDecision(
      repo,
      fixedDeps({ ids: ["id-3"], iso: "2026-06-09T10:00:00.000Z" }),
      "s-1",
      { ...baseInput(), logicalTimestamp: "2026-06-09T12:00:00.000Z" },
    );
    captureDecision(
      repo,
      fixedDeps({ ids: ["id-1"], iso: "2026-06-09T10:01:00.000Z" }),
      "s-1",
      { ...baseInput(), logicalTimestamp: "2026-06-09T09:00:00.000Z" },
    );
    captureDecision(
      repo,
      fixedDeps({ ids: ["id-2"], iso: "2026-06-09T10:02:00.000Z" }),
      "s-1",
      { ...baseInput(), logicalTimestamp: "2026-06-09T11:00:00.000Z" },
    );

    expect(listSessionDecisions(repo, "s-1").map((d) => d.id)).toEqual([
      "id-1",
      "id-2",
      "id-3",
    ]);
  });

  it("breaks logical-timestamp ties by createdAt then id", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1")],
      [link("s-1", "asset-1")],
    );
    const sameLogical = "2026-06-09T09:00:00.000Z";

    captureDecision(
      repo,
      fixedDeps({ ids: ["id-b"], iso: "2026-06-09T10:05:00.000Z" }),
      "s-1",
      { ...baseInput(), logicalTimestamp: sameLogical },
    );
    captureDecision(
      repo,
      fixedDeps({ ids: ["id-a"], iso: "2026-06-09T10:00:00.000Z" }),
      "s-1",
      { ...baseInput(), logicalTimestamp: sameLogical },
    );

    // id-a created earlier, so it comes first despite a later id alphabetically.
    expect(listSessionDecisions(repo, "s-1").map((d) => d.id)).toEqual([
      "id-a",
      "id-b",
    ]);
  });

  it("does not leak decisions across sessions", () => {
    const repo = createFakeDecisionRepository(
      [openSession("s-1"), openSession("s-2")],
      [link("s-1", "asset-1"), link("s-2", "asset-1")],
    );
    captureDecision(repo, fixedDeps({ ids: ["id-1"] }), "s-1", baseInput());
    captureDecision(repo, fixedDeps({ ids: ["id-2"] }), "s-2", baseInput());

    expect(listSessionDecisions(repo, "s-1").map((d) => d.id)).toEqual(["id-1"]);
    expect(listSessionDecisions(repo, "s-2").map((d) => d.id)).toEqual(["id-2"]);
  });

  it("refuses an unknown session", () => {
    const repo = createFakeDecisionRepository([]);
    expect(() => listSessionDecisions(repo, "missing")).toThrow(
      SessionNotFoundError,
    );
  });
});
