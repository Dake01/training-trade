import { z } from "zod";

/**
 * ISO 8601 timestamp guard. Kept as a regex (instead of relying on a specific
 * Zod minor-version datetime helper) so the contract is stable across versions.
 * Mirrors the guard used by the session schema.
 */
const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "Doit etre un timestamp ISO 8601.",
  );

/** Upper bound for a market symbol. Generous enough for `EXCHANGE:TICKER` forms. */
export const MAX_SYMBOL_LENGTH = 32;

/** Upper bound for the optional human-readable asset name. */
export const MAX_ASSET_NAME_LENGTH = 120;

/**
 * Market symbols stay broad on purpose (V1 has no external validation): a
 * letter/digit start followed by letters, digits and the separators seen in
 * `NASDAQ:AAPL`, `BTC/USDT`, `BRK.B`, `ES-MINI`. Case is preserved here; the
 * domain/service layer normalises to uppercase before persistence.
 */
const SYMBOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:/._-]*$/;

export const assetSymbolSchema = z
  .string()
  .trim()
  .min(1, "Le symbole est requis.")
  .max(MAX_SYMBOL_LENGTH, "Le symbole est trop long.")
  .regex(SYMBOL_PATTERN, "Symbole de marche invalide.");

/**
 * Optional asset name. Blank/whitespace-only input is treated as "no name"
 * (`null`) so the UI can send an empty field without tripping validation.
 */
export const assetNameSchema = z
  .string()
  .trim()
  .max(MAX_ASSET_NAME_LENGTH, "Le nom est trop long.")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

/**
 * Tracked asset DTO returned by the API in camelCase. `createdAt` is when the
 * asset entered the catalogue; `linkedAt` is when it was attached to the
 * session being viewed. Both are ISO 8601.
 */
export const trackedAssetSchema = z.object({
  id: z.string().min(1),
  symbol: assetSymbolSchema,
  name: z.string().min(1).nullable(),
  createdAt: isoDateTime,
  linkedAt: isoDateTime,
});

export type TrackedAsset = z.infer<typeof trackedAssetSchema>;

/** Payload shape for `POST /api/sessions/[id]/assets`. */
export const addSessionAssetRequestSchema = z.object({
  symbol: assetSymbolSchema,
  name: assetNameSchema.optional(),
});

export type AddSessionAssetRequest = z.infer<typeof addSessionAssetRequestSchema>;

/** Success payload for `POST /api/sessions/[id]/assets`. */
export const addSessionAssetResponseSchema = z.object({
  asset: trackedAssetSchema,
});

/** Success payload for `GET /api/sessions/[id]/assets`. */
export const sessionAssetsResponseSchema = z.object({
  assets: z.array(trackedAssetSchema),
});
