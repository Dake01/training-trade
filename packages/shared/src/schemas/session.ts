import { z } from "zod";
import { sessionStatusSchema } from "./sessionStatus";

/**
 * ISO 8601 timestamp guard. Kept as a regex (instead of relying on a specific
 * Zod minor-version datetime helper) so the contract is stable across versions.
 */
const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "Doit etre un timestamp ISO 8601.",
  );

/**
 * Full session DTO returned by the API in camelCase. `canReceiveDecisions`
 * proves the session is ready to receive future decisions (story 1.1 guard).
 */
export const sessionSchema = z.object({
  id: z.string().min(1),
  status: sessionStatusSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  openedAt: isoDateTime,
  closedAt: isoDateTime.nullable(),
  canReceiveDecisions: z.boolean(),
});

export type Session = z.infer<typeof sessionSchema>;

/** Minimal active-session context surfaced when opening a session. */
export const sessionContextSchema = z.object({
  id: z.string().min(1),
  status: sessionStatusSchema,
  openedAt: isoDateTime,
  canReceiveDecisions: z.boolean(),
});

export type SessionContext = z.infer<typeof sessionContextSchema>;

/** Payload shape for `POST /api/sessions`. */
export const createSessionResponseSchema = z.object({
  session: sessionSchema,
});

/** Payload shape for `GET /api/sessions/active`. */
export const activeSessionResponseSchema = z.object({
  session: sessionContextSchema.nullable(),
});
