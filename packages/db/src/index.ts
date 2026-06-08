import type { SessionRepository } from "@training-trade/domain";
import { createDbClient, type DbClient } from "./client";
import { createSqliteSessionRepository } from "./repository/sessionRepository";

export * from "./client";
export * from "./schema/sessions";
export * from "./repository/sessionRepository";

let defaultClient: DbClient | null = null;
let defaultRepository: SessionRepository | null = null;

/** Lazily-created singleton DB client backed by the configured SQLite path. */
export function getDefaultDbClient(): DbClient {
  if (!defaultClient) {
    defaultClient = createDbClient();
  }
  return defaultClient;
}

/** Lazily-created singleton session repository used by the API layer. */
export function getDefaultSessionRepository(): SessionRepository {
  if (!defaultRepository) {
    defaultRepository = createSqliteSessionRepository(getDefaultDbClient());
  }
  return defaultRepository;
}
