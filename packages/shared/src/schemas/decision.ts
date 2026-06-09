import { z } from "zod";

/**
 * ISO 8601 timestamp guard. Kept as a regex (instead of relying on a specific
 * Zod minor-version datetime helper) so the contract is stable across versions.
 * Mirrors the guard used by the session and asset schemas.
 */
export const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "Doit etre un timestamp ISO 8601.",
  );

/** The only two decision sides allowed in V1. Stable, canonical, lowercase. */
export const DECISION_SIDES = ["buy", "sell"] as const;

export const decisionSideSchema = z.enum(DECISION_SIDES);

export type DecisionSide = z.infer<typeof decisionSideSchema>;

/**
 * Monetary / quantity values travel as exact decimal strings end-to-end (DTO,
 * domain and SQLite TEXT) so JS floating point is never the source of truth for
 * persistence. The value must be a positive decimal: digits, an optional
 * fractional part, and strictly greater than zero.
 */
export const positiveAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Doit etre un nombre decimal positif.")
  .refine((value) => Number(value) > 0, "Doit etre strictement positif.");

/**
 * Effective revision state of a decision once its append-only amendments are
 * applied (story 1.5). `original` = no amendment; `corrected` = at least one
 * correction applied; `cancelled` = neutralised for future statistics. A
 * cancellation is terminal, so it always wins over `corrected`.
 */
export const DECISION_REVISION_STATUSES = [
  "original",
  "corrected",
  "cancelled",
] as const;

export const decisionRevisionStatusSchema = z.enum(DECISION_REVISION_STATUSES);

export type DecisionRevisionStatus = z.infer<
  typeof decisionRevisionStatusSchema
>;

/**
 * Decision DTO returned by the API in camelCase. `logicalTimestamp` is the
 * session-relative ordering instant; `createdAt` is the audit instant. Both are
 * ISO 8601. `quantity` and `referencePrice` are exact decimal strings.
 *
 * `comment` and `revisionStatus` describe the effective state after the
 * decision's append-only amendments (story 1.5). They are optional so the
 * story 1.4 contract stays compatible; the domain always emits them (defaulting
 * to `null` / `"original"`), and the listed values reflect the latest comment
 * and any applied correction/cancellation.
 */
export const decisionSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  assetId: z.string().min(1),
  side: decisionSideSchema,
  quantity: positiveAmountSchema,
  referencePrice: positiveAmountSchema,
  logicalTimestamp: isoDateTime,
  createdAt: isoDateTime,
  comment: z.string().nullable().optional(),
  revisionStatus: decisionRevisionStatusSchema.optional(),
});

export type Decision = z.infer<typeof decisionSchema>;

/**
 * Payload shape for `POST /api/sessions/[id]/decisions`. `assetId` must point at
 * an asset already linked to the session (verified by the domain, not here).
 * `logicalTimestamp` is optional: when omitted the domain stamps the capture
 * instant so the UI can submit without managing a replay clock.
 */
export const captureDecisionRequestSchema = z.object({
  assetId: z.string().min(1, "L'actif est requis."),
  side: decisionSideSchema,
  quantity: positiveAmountSchema,
  referencePrice: positiveAmountSchema,
  logicalTimestamp: isoDateTime.optional(),
});

export type CaptureDecisionRequest = z.infer<typeof captureDecisionRequestSchema>;

/** Success payload for `POST /api/sessions/[id]/decisions`. */
export const captureDecisionResponseSchema = z.object({
  decision: decisionSchema,
});

/** Success payload for `GET /api/sessions/[id]/decisions`. */
export const sessionDecisionsResponseSchema = z.object({
  decisions: z.array(decisionSchema),
});
