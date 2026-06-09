import {
  addDecisionComment,
  cancelDecision,
  captureDecision,
  correctDecision,
  listDecisionTimeline,
  systemDecisionDeps,
  type DecisionAmendmentRepository,
  type DecisionRepository,
} from "@training-trade/domain";
import {
  amendDecisionRequestSchema,
  apiErrors,
  captureDecisionRequestSchema,
  fail,
  ok,
} from "@training-trade/shared";
import { errorResponse, jsonResponse } from "./http";

/** Parse a request body as JSON, returning `undefined` on a malformed body. */
async function readJsonBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

/**
 * POST /api/sessions/[id]/decisions — capture a buy/sell decision on an open
 * session (AC 1). Returns 201 on success, 400 on an invalid payload, 404 for an
 * unknown session, and 409 when the session is not active or the asset is not
 * linked to it. Business rules live in the domain; this handler only validates
 * the payload and orchestrates.
 */
export async function handleCaptureDecision(
  repo: DecisionRepository,
  id: string,
  request: Request,
): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonResponse(
      fail(apiErrors.validation("Corps de requete JSON invalide.")),
      400,
    );
  }

  const parsed = captureDecisionRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Requete invalide.";
    return jsonResponse(fail(apiErrors.validation(message)), 400);
  }

  try {
    const decision = captureDecision(repo, systemDecisionDeps, id, parsed.data);
    return jsonResponse(ok({ decision }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/sessions/[id]/decisions/[decisionId]/amendments — add a comment, or
 * apply an explicit correction or cancellation to a decision (AC 1, 2). Returns
 * 201 with the recomputed effective decision, 400 on an invalid payload, 404 for
 * an unknown session/decision, and 409 when the session is not active, the
 * decision is no longer amendable, or a correction's replacement asset is not
 * linked to the session. Business rules live in the domain (append-only); this
 * handler validates the payload and dispatches on `kind`.
 */
export async function handleAmendDecision(
  repo: DecisionAmendmentRepository,
  sessionId: string,
  decisionId: string,
  request: Request,
): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonResponse(
      fail(apiErrors.validation("Corps de requete JSON invalide.")),
      400,
    );
  }

  const parsed = amendDecisionRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Requete invalide.";
    return jsonResponse(fail(apiErrors.validation(message)), 400);
  }

  try {
    const amendment = parsed.data;
    const decision =
      amendment.kind === "comment"
        ? addDecisionComment(repo, systemDecisionDeps, sessionId, decisionId, {
            comment: amendment.comment,
          })
        : amendment.kind === "correction"
          ? correctDecision(repo, systemDecisionDeps, sessionId, decisionId, {
              reason: amendment.reason,
              replacement: amendment.replacement,
            })
          : cancelDecision(repo, systemDecisionDeps, sessionId, decisionId, {
              reason: amendment.reason,
            });
    return jsonResponse(ok({ decision }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/sessions/[id]/decisions — list a session's decision history in its
 * effective state (AC 1, 2, 3): each decision carries its latest comment and any
 * applied correction/cancellation (`revisionStatus`), in a stable replay order.
 * Returns 200 with the (possibly empty) list, or 404 when the session is
 * unknown. A closed session keeps its decisions and stays consultable.
 */
export function handleListSessionDecisions(
  repo: DecisionAmendmentRepository,
  id: string,
): Response {
  try {
    const timeline = listDecisionTimeline(repo, id);
    return jsonResponse(
      ok({
        decisions: timeline.map((entry) => entry.decision),
        timeline,
      }),
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
