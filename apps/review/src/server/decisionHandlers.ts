import {
  captureDecision,
  listSessionDecisions,
  systemDecisionDeps,
  type DecisionRepository,
} from "@training-trade/domain";
import {
  apiErrors,
  captureDecisionRequestSchema,
  fail,
  ok,
} from "@training-trade/shared";
import { errorResponse, jsonResponse } from "./http";

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
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse(
      fail(apiErrors.validation("Corps de requete JSON invalide.")),
      400,
    );
  }

  const parsed = captureDecisionRequestSchema.safeParse(rawBody);
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
 * GET /api/sessions/[id]/decisions — list a session's decision history (AC 2).
 * Returns 200 with the (possibly empty) ordered list, or 404 when the session
 * is unknown. A closed session keeps its decisions and stays consultable.
 */
export function handleListSessionDecisions(
  repo: DecisionRepository,
  id: string,
): Response {
  try {
    const decisions = listSessionDecisions(repo, id);
    return jsonResponse(ok({ decisions }), 200);
  } catch (error) {
    return errorResponse(error);
  }
}
