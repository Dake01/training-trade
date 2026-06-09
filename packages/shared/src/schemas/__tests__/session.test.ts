import { describe, expect, it } from "vitest";
import {
  activeSessionResponseSchema,
  closeSessionResponseSchema,
  resumeSessionResponseSchema,
} from "../session";

const openSession = {
  id: "id-1",
  status: "open" as const,
  createdAt: "2026-06-08T14:00:00.000Z",
  updatedAt: "2026-06-08T14:30:00.000Z",
  openedAt: "2026-06-08T14:00:00.000Z",
  closedAt: null,
  canReceiveDecisions: true,
};

const closedSession = {
  ...openSession,
  status: "closed" as const,
  updatedAt: "2026-06-08T15:10:00.000Z",
  closedAt: "2026-06-08T15:10:00.000Z",
  canReceiveDecisions: false,
};

describe("activeSessionResponseSchema", () => {
  it("accepts the no-active-session payload", () => {
    expect(
      activeSessionResponseSchema.parse({ session: null }),
    ).toEqual({ session: null });
  });
});

describe("resumeSessionResponseSchema", () => {
  it("accepts a resumed (open) session payload", () => {
    expect(
      resumeSessionResponseSchema.parse({ session: openSession }),
    ).toEqual({ session: openSession });
  });

  it("rejects a closed session payload", () => {
    expect(() =>
      resumeSessionResponseSchema.parse({ session: closedSession }),
    ).toThrow();
  });

  it("rejects an open session that cannot receive decisions", () => {
    expect(() =>
      resumeSessionResponseSchema.parse({
        session: { ...openSession, canReceiveDecisions: false },
      }),
    ).toThrow();
  });
});

describe("closeSessionResponseSchema", () => {
  it("accepts a closed session payload with canReceiveDecisions false", () => {
    const parsed = closeSessionResponseSchema.parse({ session: closedSession });
    expect(parsed.session.status).toBe("closed");
    expect(parsed.session.canReceiveDecisions).toBe(false);
    expect(parsed.session.closedAt).toBe("2026-06-08T15:10:00.000Z");
  });

  it("rejects an open session payload", () => {
    expect(() =>
      closeSessionResponseSchema.parse({ session: openSession }),
    ).toThrow();
  });

  it("rejects a closed session without a close timestamp", () => {
    expect(() =>
      closeSessionResponseSchema.parse({
        session: { ...closedSession, closedAt: null },
      }),
    ).toThrow();
  });
});
