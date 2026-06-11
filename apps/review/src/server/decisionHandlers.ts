
import {
  addDecisionComment,
  applyDecisionToPortfolio,
  cancelDecision,
  captureDecision,
  correctDecision,
  listDecisionTimeline,
  rebuildSessionPortfolio,
  systemDecisionDeps,
  systemSessionDeps,
  type DecisionAmendmentRepository,
  type DecisionRepository,
  type PortfolioRepository,
} from "@training-trade/domain";
import { runInTransaction, type DbClient } from "@training-trade/db";
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
  clientOrRepo: DbClient | DecisionRepository,
  repoOrPortfolio: DecisionRepository | PortfolioRepository,
  portfolioOrId: PortfolioRepository | string,
  idOrRequest: string | Request,
  maybeRequest?: Request,
): Promise<Response> {
  const client = resolveDbClient(clientOrRepo, repoOrPortfolio as PortfolioRepository);
  const repo = isDbClient(clientOrRepo)
    ? (repoOrPortfolio as DecisionRepository)
    : (clientOrRepo as DecisionRepository);
  const portfolioRepo = isDbClient(clientOrRepo)
    ? (portfolioOrId as PortfolioRepository)
    : (repoOrPortfolio as PortfolioRepository);
  const id = isDbClient(clientOrRepo) ? (idOrRequest as string) : (portfolioOrId as string);
  const request = isDbClient(clientOrRepo) ? (maybeRequest as Request) : (idOrRequest as Request);
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
    let decision = null as Awaited<ReturnType<typeof captureDecision>> | null;
    const mutate = () => {
      decision = captureDecision(repo, systemDecisionDeps, id, parsed.data);
      if (portfolioRepo.findBootstrap(id)) {
        applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, id, {
          decisionId: decision.id,
          assetId: decision.assetId,
          side: decision.side,
          quantity: decision.quantity,
          referencePrice: decision.referencePrice,
        });
      }
    };
    if (client) {
      runInTransaction(client, mutate);
    } else {
      mutate();
    }
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
  clientOrRepo: DbClient | DecisionAmendmentRepository,
  repoOrPortfolio: DecisionAmendmentRepository | PortfolioRepository,
  portfolioOrSessionId: PortfolioRepository | string,
  sessionIdOrDecisionId: string,
  decisionIdOrRequest: string | Request,
  maybeRequest?: Request,
): Promise<Response> {
  const client = resolveDbClient(clientOrRepo, repoOrPortfolio as PortfolioRepository);
  const repo = isDbClient(clientOrRepo)
    ? (repoOrPortfolio as DecisionAmendmentRepository)
    : (clientOrRepo as DecisionAmendmentRepository);
  const portfolioRepo = isDbClient(clientOrRepo)
    ? (portfolioOrSessionId as PortfolioRepository)
    : (repoOrPortfolio as PortfolioRepository);
  const sessionId = isDbClient(clientOrRepo)
    ? sessionIdOrDecisionId
    : (portfolioOrSessionId as string);
  const decisionId = isDbClient(clientOrRepo)
    ? (decisionIdOrRequest as string)
    : sessionIdOrDecisionId;
  const request = isDbClient(clientOrRepo)
    ? (maybeRequest as Request)
    : (decisionIdOrRequest as Request);
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
    let decision = null as Awaited<ReturnType<typeof addDecisionComment>> | null;
    const mutate = () => {
      const amendment = parsed.data;
      decision =
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

      // Corrections and cancellations change the effective portfolio state — rebuild.
      if (amendment.kind !== "comment" && portfolioRepo.findBootstrap(sessionId)) {
        const timeline = listDecisionTimeline(repo, sessionId);
        const effective = timeline
          .filter((e) => e.decision.revisionStatus !== "cancelled")
          .map((e) => ({
            decisionId: e.decision.id,
            assetId: e.decision.assetId,
            side: e.decision.side,
            quantity: e.decision.quantity,
            referencePrice: e.decision.referencePrice,
          }));
        rebuildSessionPortfolio(portfolioRepo, systemSessionDeps, sessionId, effective);
      }
    };
    if (client) {
      runInTransaction(client, mutate);
    } else {
      mutate();
    }

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

function isDbClient(value: unknown): value is DbClient {
  return typeof value === "object" && value !== null && "sqlite" in value && "db" in value;
}

function resolveDbClient(primary: unknown, fallback: PortfolioRepository): DbClient | null {
  const fromPrimary = (primary as { __client?: DbClient } | null | undefined)?.__client;
  if (fromPrimary) return fromPrimary;
  const fromFallback = (fallback as { __client?: DbClient } | null | undefined)?.__client;
  if (fromFallback) return fromFallback;
  return null;
}
