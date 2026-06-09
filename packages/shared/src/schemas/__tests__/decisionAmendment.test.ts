import { describe, expect, it } from "vitest";
import {
  DECISION_COMMENT_MAX_LENGTH,
  amendDecisionRequestSchema,
  amendDecisionResponseSchema,
  decisionAmendmentSchema,
  decisionCommentSchema,
  decisionCorrectionReplacementSchema,
  decisionTimelineEntrySchema,
} from "../decisionAmendment";

const decision = {
  id: "decision-1",
  sessionId: "session-1",
  assetId: "asset-1",
  side: "buy" as const,
  quantity: "10",
  referencePrice: "123.45",
  logicalTimestamp: "2026-06-09T09:00:00.000Z",
  createdAt: "2026-06-09T09:00:00.000Z",
  comment: "Contexte" as string | null,
  revisionStatus: "corrected" as const,
};

const replacement = {
  assetId: "asset-2",
  side: "sell" as const,
  quantity: "12",
  referencePrice: "100.10",
  logicalTimestamp: "2026-06-09T10:00:00.000Z",
};

describe("decisionCommentSchema", () => {
  it("trims and accepts a short comment", () => {
    expect(decisionCommentSchema.parse("  ok  ")).toBe("ok");
  });

  it("rejects an empty comment", () => {
    expect(() => decisionCommentSchema.parse("   ")).toThrow();
  });

  it("rejects a comment over the explicit length limit", () => {
    expect(() =>
      decisionCommentSchema.parse("x".repeat(DECISION_COMMENT_MAX_LENGTH + 1)),
    ).toThrow();
  });

  it("accepts a comment exactly at the limit", () => {
    const value = "x".repeat(DECISION_COMMENT_MAX_LENGTH);
    expect(decisionCommentSchema.parse(value)).toBe(value);
  });
});

describe("decisionCorrectionReplacementSchema", () => {
  it("accepts a full replacement", () => {
    expect(decisionCorrectionReplacementSchema.parse(replacement)).toEqual(
      replacement,
    );
  });

  it("accepts a replacement without a logical timestamp", () => {
    const { logicalTimestamp: _omit, ...rest } = replacement;
    expect(
      decisionCorrectionReplacementSchema.parse(rest).logicalTimestamp,
    ).toBeUndefined();
  });

  it.each(["0", "-1", "abc"])("rejects a non-positive quantity %s", (qty) => {
    expect(() =>
      decisionCorrectionReplacementSchema.parse({ ...replacement, quantity: qty }),
    ).toThrow();
  });
});

describe("amendDecisionRequestSchema", () => {
  it("accepts a comment amendment", () => {
    const parsed = amendDecisionRequestSchema.parse({
      kind: "comment",
      comment: "Saisie volontaire",
    });
    expect(parsed.kind).toBe("comment");
  });

  it("accepts a correction with a reason and a replacement", () => {
    const parsed = amendDecisionRequestSchema.parse({
      kind: "correction",
      reason: "Quantite saisie trop faible",
      replacement,
    });
    expect(parsed).toMatchObject({ kind: "correction" });
  });

  it("accepts a correction without a reason", () => {
    expect(
      amendDecisionRequestSchema.parse({ kind: "correction", replacement }),
    ).toMatchObject({ kind: "correction" });
  });

  it("rejects a correction without a replacement", () => {
    expect(() =>
      amendDecisionRequestSchema.parse({ kind: "correction" }),
    ).toThrow();
  });

  it("accepts a cancellation with an optional reason", () => {
    expect(
      amendDecisionRequestSchema.parse({
        kind: "cancellation",
        reason: "Saisie accidentelle",
      }),
    ).toMatchObject({ kind: "cancellation" });
    expect(
      amendDecisionRequestSchema.parse({ kind: "cancellation" }),
    ).toMatchObject({ kind: "cancellation" });
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      amendDecisionRequestSchema.parse({ kind: "delete" }),
    ).toThrow();
  });
});

describe("decisionAmendmentSchema", () => {
  it("accepts a comment event with null reason/replacement", () => {
    const event = {
      id: "amend-1",
      decisionId: "decision-1",
      sessionId: "session-1",
      kind: "comment" as const,
      comment: "Contexte",
      reason: null,
      replacement: null,
      createdAt: "2026-06-09T09:30:00.000Z",
    };
    expect(decisionAmendmentSchema.parse(event)).toEqual(event);
  });
});

describe("amendDecisionResponseSchema / decisionTimelineEntrySchema", () => {
  it("accepts the effective decision payload", () => {
    expect(amendDecisionResponseSchema.parse({ decision })).toEqual({
      decision,
    });
  });

  it("accepts a timeline entry", () => {
    const entry = { decision, amendments: [] };
    expect(decisionTimelineEntrySchema.parse(entry)).toEqual(entry);
  });
});
