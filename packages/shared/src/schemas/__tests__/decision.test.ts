import { describe, expect, it } from "vitest";
import {
  captureDecisionRequestSchema,
  captureDecisionResponseSchema,
  decisionSchema,
  decisionSideSchema,
  positiveAmountSchema,
  sessionDecisionsResponseSchema,
} from "../decision";

const decision = {
  id: "decision-1",
  sessionId: "session-1",
  assetId: "asset-1",
  side: "buy" as const,
  quantity: "10",
  referencePrice: "123.45",
  logicalTimestamp: "2026-06-09T09:00:00.000Z",
  createdAt: "2026-06-09T09:00:00.000Z",
};

describe("decisionSideSchema", () => {
  it.each(["buy", "sell"])("accepts the canonical side %s", (side) => {
    expect(decisionSideSchema.parse(side)).toBe(side);
  });

  it.each(["BUY", "achat", "long", "", "hold"])(
    "rejects any other side %s",
    (side) => {
      expect(() => decisionSideSchema.parse(side)).toThrow();
    },
  );
});

describe("positiveAmountSchema", () => {
  it.each(["1", "10", "123.45", "0.01", "1000000.000001"])(
    "accepts the exact positive decimal %s",
    (value) => {
      expect(positiveAmountSchema.parse(value)).toBe(value);
    },
  );

  it("trims surrounding whitespace", () => {
    expect(positiveAmountSchema.parse("  12.5  ")).toBe("12.5");
  });

  it.each(["0", "0.00", "-1", "-0.5"])(
    "rejects the non-positive value %s",
    (value) => {
      expect(() => positiveAmountSchema.parse(value)).toThrow();
    },
  );

  it.each(["abc", "1,5", "1e3", "12.", ".5", "1.2.3", ""])(
    "rejects the malformed value %s",
    (value) => {
      expect(() => positiveAmountSchema.parse(value)).toThrow();
    },
  );
});

describe("captureDecisionRequestSchema", () => {
  it("accepts a full capture payload", () => {
    const parsed = captureDecisionRequestSchema.parse({
      assetId: "asset-1",
      side: "sell",
      quantity: "5",
      referencePrice: "99.9",
      logicalTimestamp: "2026-06-09T10:00:00.000Z",
    });
    expect(parsed.side).toBe("sell");
    expect(parsed.logicalTimestamp).toBe("2026-06-09T10:00:00.000Z");
  });

  it("accepts a payload without a logical timestamp", () => {
    const parsed = captureDecisionRequestSchema.parse({
      assetId: "asset-1",
      side: "buy",
      quantity: "5",
      referencePrice: "99.9",
    });
    expect(parsed.logicalTimestamp).toBeUndefined();
  });

  it("rejects a missing asset", () => {
    expect(() =>
      captureDecisionRequestSchema.parse({
        assetId: "",
        side: "buy",
        quantity: "5",
        referencePrice: "99.9",
      }),
    ).toThrow();
  });

  it("rejects a non-positive quantity", () => {
    expect(() =>
      captureDecisionRequestSchema.parse({
        assetId: "asset-1",
        side: "buy",
        quantity: "0",
        referencePrice: "99.9",
      }),
    ).toThrow();
  });

  it("rejects a non ISO logical timestamp", () => {
    expect(() =>
      captureDecisionRequestSchema.parse({
        assetId: "asset-1",
        side: "buy",
        quantity: "5",
        referencePrice: "99.9",
        logicalTimestamp: "2026/06/09",
      }),
    ).toThrow();
  });
});

describe("decisionSchema", () => {
  it("accepts a full decision DTO", () => {
    expect(decisionSchema.parse(decision)).toEqual(decision);
  });

  it("rejects a non ISO createdAt", () => {
    expect(() =>
      decisionSchema.parse({ ...decision, createdAt: "2026/06/09" }),
    ).toThrow();
  });
});

describe("decision response schemas", () => {
  it("accepts the capture payload", () => {
    expect(captureDecisionResponseSchema.parse({ decision })).toEqual({
      decision,
    });
  });

  it("accepts the list payload", () => {
    expect(
      sessionDecisionsResponseSchema.parse({ decisions: [decision] }),
    ).toEqual({ decisions: [decision] });
  });

  it("accepts an empty list", () => {
    expect(sessionDecisionsResponseSchema.parse({ decisions: [] })).toEqual({
      decisions: [],
    });
  });
});
