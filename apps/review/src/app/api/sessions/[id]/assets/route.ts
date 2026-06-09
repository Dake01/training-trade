import { getDefaultSessionAssetRepository } from "@training-trade/db";
import {
  handleAddSessionAsset,
  handleListSessionAssets,
} from "@/server/assetHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return handleAddSessionAsset(getDefaultSessionAssetRepository(), id, request);
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return handleListSessionAssets(getDefaultSessionAssetRepository(), id);
}
