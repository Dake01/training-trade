import {
  addSessionAsset,
  listSessionAssets,
  systemSessionDeps,
  type SessionAssetRepository,
} from "@training-trade/domain";
import {
  addSessionAssetRequestSchema,
  apiErrors,
  fail,
  ok,
} from "@training-trade/shared";
import { errorResponse, jsonResponse } from "./http";

/**
 * POST /api/sessions/[id]/assets — attach a tracked asset to an open session
 * (AC 1). Returns 201 when a new link is created, 200 when the asset was
 * already linked (idempotent), 400 on an invalid payload, 404 for an unknown
 * session and 409 when the session is not active. Business rules live in the
 * domain; this handler only validates the payload and orchestrates.
 */
export async function handleAddSessionAsset(
  repo: SessionAssetRepository,
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

  const parsed = addSessionAssetRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Requete invalide.";
    return jsonResponse(fail(apiErrors.validation(message)), 400);
  }

  try {
    const { asset, created } = addSessionAsset(
      repo,
      systemSessionDeps,
      id,
      parsed.data,
    );
    return jsonResponse(ok({ asset }), created ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/sessions/[id]/assets — list the assets attached to a session (AC 2).
 * Returns 200 with the (possibly empty) list, or 404 when the session is
 * unknown. A closed session keeps its assets and stays consultable.
 */
export function handleListSessionAssets(
  repo: SessionAssetRepository,
  id: string,
): Response {
  try {
    const assets = listSessionAssets(repo, id);
    return jsonResponse(ok({ assets }), 200);
  } catch (error) {
    return errorResponse(error);
  }
}
