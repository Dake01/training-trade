import { describe, expect, it } from "vitest";
import { activeSessionResponseSchema } from "../session";

describe("activeSessionResponseSchema", () => {
  it("accepts the no-active-session payload", () => {
    expect(
      activeSessionResponseSchema.parse({ session: null }),
    ).toEqual({ session: null });
  });
});
