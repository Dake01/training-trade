import { z } from "zod";
import {
  decisionSchema,
  decisionSideSchema,
  isoDateTime,
  positiveAmountSchema,
} from "./decision";

/**
 * Append-only amendment kinds (story 1.5). A decision is never mutated nor
 * deleted: every comment, correction or cancellation is recorded as a new
 * event linked to the root decision so the history stays auditable.
 */
export const DECISION_AMENDMENT_KINDS = [
  "comment",
  "correction",
  "cancellation",
] as const;

export const decisionAmendmentKindSchema = z.enum(DECISION_AMENDMENT_KINDS);

export type DecisionAmendmentKind = z.infer<typeof decisionAmendmentKindSchema>;

/**
 * A comment is short by design: an explicit, validated upper bound keeps the
 * note as context, not free-form prose. Trimmed and non-empty.
 */
export const DECISION_COMMENT_MAX_LENGTH = 280;

export const decisionCommentSchema = z
  .string()
  .trim()
  .min(1, "Le commentaire ne peut pas etre vide.")
  .max(
    DECISION_COMMENT_MAX_LENGTH,
    `Le commentaire est limite a ${DECISION_COMMENT_MAX_LENGTH} caracteres.`,
  );

/**
 * Optional reason attached to a correction or cancellation. Same short bound as
 * a comment so the audit note stays concise.
 */
export const decisionReasonSchema = z
  .string()
  .trim()
  .min(1, "Le motif ne peut pas etre vide.")
  .max(
    DECISION_COMMENT_MAX_LENGTH,
    `Le motif est limite a ${DECISION_COMMENT_MAX_LENGTH} caracteres.`,
  );

/**
 * Replacement business fields applied by a correction. A correction restates
 * the decision explicitly (no silent partial patch): the asset, side, quantity
 * and reference price are all required. `logicalTimestamp` is optional and, when
 * provided, re-positions the corrected event in the replay order.
 */
export const decisionCorrectionReplacementSchema = z.object({
  assetId: z.string().min(1, "L'actif est requis."),
  side: decisionSideSchema,
  quantity: positiveAmountSchema,
  referencePrice: positiveAmountSchema,
  logicalTimestamp: isoDateTime.optional(),
});

export type DecisionCorrectionReplacement = z.infer<
  typeof decisionCorrectionReplacementSchema
>;

/**
 * Discriminated request body for
 * `POST /api/sessions/[id]/decisions/[decisionId]/amendments`. The `kind`
 * discriminant selects the payload shape, so an invalid combination (e.g. a
 * correction without a replacement) is rejected at the boundary.
 */
export const amendDecisionRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("comment"),
    comment: decisionCommentSchema,
  }),
  z.object({
    kind: z.literal("correction"),
    reason: decisionReasonSchema.optional(),
    replacement: decisionCorrectionReplacementSchema,
  }),
  z.object({
    kind: z.literal("cancellation"),
    reason: decisionReasonSchema.optional(),
  }),
]);

export type AmendDecisionRequest = z.infer<typeof amendDecisionRequestSchema>;

/**
 * Public DTO for a single amendment event (the auditable trail). `comment` is
 * set for a comment, `reason` for a correction/cancellation, and `replacement`
 * for a correction. Timestamps are ISO 8601.
 */
export const decisionAmendmentSchema = z.object({
  id: z.string().min(1),
  decisionId: z.string().min(1),
  sessionId: z.string().min(1),
  kind: decisionAmendmentKindSchema,
  comment: z.string().nullable(),
  reason: z.string().nullable(),
  replacement: decisionCorrectionReplacementSchema.nullable(),
  createdAt: isoDateTime,
});

export type DecisionAmendment = z.infer<typeof decisionAmendmentSchema>;

/** Success payload for the amendment endpoint: the recomputed effective decision. */
export const amendDecisionResponseSchema = z.object({
  decision: decisionSchema,
});

/**
 * Timeline entry: the effective decision plus its ordered amendment events, so
 * the prior state stays traceable and readable in the history.
 */
export const decisionTimelineEntrySchema = z.object({
  decision: decisionSchema,
  amendments: z.array(decisionAmendmentSchema),
});

export type DecisionTimelineEntry = z.infer<typeof decisionTimelineEntrySchema>;
