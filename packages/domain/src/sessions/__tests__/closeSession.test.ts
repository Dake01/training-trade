import { describe, expect, it } from "vitest";
import {
  SessionAlreadyClosedError,
  SessionNotActiveError,
  SessionNotFoundError,
} from "../errors";
import { closeSession } from "../closeSession";
import type { SessionRecord } from "../types";
import { createFakeSessionRepository, fixedDeps } from "./fakeRepo";

const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s-1",
    status: "open",
    createdAt: "2026-06-08T10:00:00.000Z",
    updatedAt: "2026-06-08T10:00:00.000Z",
    openedAt: "2026-06-08T10:00:00.000Z",
    closedAt: null,
    ...overrides,
  };
}

describe("closeSession", () => {
  it("closes an open session and blocks future decisions", () => {
    const open = record({ status: "open" });
    const repo = createFakeSessionRepository([open]);

    const session = closeSession(
      repo,
      fixedDeps({ iso: "2026-06-08T15:10:00.000Z" }),
      "s-1",
    );

    expect(session.id).toBe("s-1");
    expect(session.status).toBe("closed");
    expect(session.canReceiveDecisions).toBe(false);
    // createdAt / openedAt preserved, closedAt + updatedAt set to the close instant.
    expect(session.createdAt).toBe(open.createdAt);
    expect(session.openedAt).toBe(open.openedAt);
    expect(session.closedAt).toBe("2026-06-08T15:10:00.000Z");
    expect(session.updatedAt).toBe("2026-06-08T15:10:00.000Z");
    expect(session.closedAt).toMatch(ISO_8601);
    // No active session remains.
    expect(repo.findActive()).toBeNull();
  });

  it("throws when the session is already closed", () => {
    const closed = record({
      status: "closed",
      closedAt: "2026-06-08T12:00:00.000Z",
    });
    const repo = createFakeSessionRepository([closed]);

    expect(() => closeSession(repo, fixedDeps(), "s-1")).toThrow(
      SessionAlreadyClosedError,
    );
  });

  it("refuses to close a suspended session (out of scope)", () => {
    const suspended = record({ status: "suspended" });
    const repo = createFakeSessionRepository([suspended]);

    expect(() => closeSession(repo, fixedDeps(), "s-1")).toThrow(
      SessionNotActiveError,
    );
    expect(repo.findById("s-1")?.status).toBe("suspended");
  });

  it("throws when the session does not exist", () => {
    const repo = createFakeSessionRepository([]);
    expect(() => closeSession(repo, fixedDeps(), "missing")).toThrow(
      SessionNotFoundError,
    );
  });
});
