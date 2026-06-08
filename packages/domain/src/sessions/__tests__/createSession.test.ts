import { describe, expect, it } from "vitest";
import { createSession } from "../createSession";
import { ActiveSessionExistsError } from "../errors";
import type { SessionRecord } from "../types";
import { createFakeSessionRepository, fixedDeps } from "./fakeRepo";

const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

describe("createSession", () => {
  it("creates and immediately opens a session with status open", () => {
    const repo = createFakeSessionRepository();
    const session = createSession(repo, fixedDeps());

    expect(session.status).toBe("open");
    expect(session.canReceiveDecisions).toBe(true);
    expect(session.closedAt).toBeNull();
  });

  it("persists ISO 8601 timestamps with openedAt equal to createdAt", () => {
    const repo = createFakeSessionRepository();
    const session = createSession(repo, fixedDeps());

    expect(session.createdAt).toMatch(ISO_8601);
    expect(session.openedAt).toMatch(ISO_8601);
    expect(session.updatedAt).toMatch(ISO_8601);
    // Created then opened immediately => same instant.
    expect(session.openedAt).toBe(session.createdAt);
  });

  it("generates a unique identifier per session", () => {
    const first = createSession(
      createFakeSessionRepository(),
      fixedDeps({ ids: ["uuid-a"] }),
    );
    const second = createSession(
      createFakeSessionRepository(),
      fixedDeps({ ids: ["uuid-b"] }),
    );

    expect(first.id).toBe("uuid-a");
    expect(second.id).toBe("uuid-b");
    expect(first.id).not.toBe(second.id);
  });

  it("refuses creation when an active session already exists", () => {
    const existing: SessionRecord = {
      id: "existing",
      status: "open",
      createdAt: "2026-06-08T10:00:00.000Z",
      updatedAt: "2026-06-08T10:00:00.000Z",
      openedAt: "2026-06-08T10:00:00.000Z",
      closedAt: null,
    };
    const repo = createFakeSessionRepository([existing]);

    expect(() => createSession(repo, fixedDeps())).toThrow(
      ActiveSessionExistsError,
    );
    // The active session is unchanged and no second session was inserted.
    expect(repo.findActive()?.id).toBe("existing");
  });
});
