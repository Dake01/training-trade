import { describe, expect, it } from "vitest";
import {
  ActiveSessionExistsError,
  SessionAlreadyClosedError,
  SessionNotFoundError,
} from "../errors";
import { resumeSession } from "../resumeSession";
import type { SessionRecord } from "../types";
import { createFakeSessionRepository, fixedDeps } from "./fakeRepo";

const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s-1",
    status: "suspended",
    createdAt: "2026-06-08T10:00:00.000Z",
    updatedAt: "2026-06-08T10:00:00.000Z",
    openedAt: "2026-06-08T10:00:00.000Z",
    closedAt: null,
    ...overrides,
  };
}

describe("resumeSession", () => {
  it("resumes a suspended session back to open without losing history", () => {
    const suspended = record({ status: "suspended" });
    const repo = createFakeSessionRepository([suspended]);

    const session = resumeSession(
      repo,
      fixedDeps({ iso: "2026-06-08T14:30:00.000Z" }),
      "s-1",
    );

    expect(session.id).toBe("s-1");
    expect(session.status).toBe("open");
    expect(session.canReceiveDecisions).toBe(true);
    expect(session.closedAt).toBeNull();
    // History preserved: same id, original createdAt/openedAt kept.
    expect(session.createdAt).toBe(suspended.createdAt);
    expect(session.openedAt).toBe(suspended.openedAt);
    // updatedAt bumped to the resume instant.
    expect(session.updatedAt).toBe("2026-06-08T14:30:00.000Z");
    expect(session.updatedAt).toMatch(ISO_8601);
  });

  it("is idempotent when the session is already open", () => {
    const open = record({ status: "open" });
    const repo = createFakeSessionRepository([open]);

    const session = resumeSession(repo, fixedDeps(), "s-1");

    expect(session.id).toBe("s-1");
    expect(session.status).toBe("open");
    expect(session.canReceiveDecisions).toBe(true);
    // Still exactly one active session, unchanged.
    expect(repo.findActive()?.id).toBe("s-1");
  });

  it("refuses to resume a closed session (reopen is out of scope)", () => {
    const closed = record({
      status: "closed",
      closedAt: "2026-06-08T12:00:00.000Z",
    });
    const repo = createFakeSessionRepository([closed]);

    expect(() => resumeSession(repo, fixedDeps(), "s-1")).toThrow(
      SessionAlreadyClosedError,
    );
    expect(repo.findById("s-1")?.status).toBe("closed");
  });

  it("throws when the session does not exist", () => {
    const repo = createFakeSessionRepository([]);
    expect(() => resumeSession(repo, fixedDeps(), "missing")).toThrow(
      SessionNotFoundError,
    );
  });

  it("refuses to resume when another session is already open", () => {
    const suspended = record({ id: "s-1", status: "suspended" });
    const otherOpen = record({ id: "s-2", status: "open" });
    const repo = createFakeSessionRepository([suspended, otherOpen]);

    expect(() => resumeSession(repo, fixedDeps(), "s-1")).toThrow(
      ActiveSessionExistsError,
    );
    // No second active session was produced.
    expect(repo.findById("s-1")?.status).toBe("suspended");
    expect(repo.findActive()?.id).toBe("s-2");
  });
});
