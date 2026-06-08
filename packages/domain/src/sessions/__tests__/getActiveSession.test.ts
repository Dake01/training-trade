import { describe, expect, it } from "vitest";
import { createSession } from "../createSession";
import { getActiveSession } from "../getActiveSession";
import { createFakeSessionRepository, fixedDeps } from "./fakeRepo";

describe("getActiveSession", () => {
  it("returns null when no session is active", () => {
    const repo = createFakeSessionRepository();
    expect(getActiveSession(repo)).toBeNull();
  });

  it("returns the minimal context of the active session", () => {
    const repo = createFakeSessionRepository();
    const created = createSession(repo, fixedDeps({ ids: ["ctx-id"] }));

    const context = getActiveSession(repo);

    expect(context).not.toBeNull();
    expect(context).toEqual({
      id: created.id,
      status: "open",
      openedAt: created.openedAt,
      canReceiveDecisions: true,
    });
  });
});
