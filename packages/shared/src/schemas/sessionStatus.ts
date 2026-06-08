import { z } from "zod";

/**
 * Full domain status enum. Story 1.1 only ever creates `open`; `suspended`
 * and `closed` are declared here so later stories (1.2+) can implement their
 * transitions without changing this contract.
 */
export const SESSION_STATUSES = ["open", "suspended", "closed"] as const;

export const sessionStatusSchema = z.enum(SESSION_STATUSES);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

/** The only status this story is allowed to create. */
export const CREATABLE_SESSION_STATUS: SessionStatus = "open";

/** A session is "active" (and able to receive decisions) while it is open. */
export function isActiveStatus(status: SessionStatus): boolean {
  return status === "open";
}
