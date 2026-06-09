import type {
  DecisionRepository,
  SessionAssetRepository,
  SessionRepository,
} from "@training-trade/domain";
import { createDbClient, type DbClient } from "./client";
import { createSqliteSessionRepository } from "./repository/sessionRepository";
import { createSqliteSessionAssetRepository } from "./repository/sessionAssetRepository";
import { createSqliteDecisionRepository } from "./repository/decisionRepository";

export * from "./client";
export * from "./schema";
export * from "./repository/sessionRepository";
export * from "./repository/sessionAssetRepository";
export * from "./repository/decisionRepository";

let defaultClient: DbClient | null = null;
let defaultRepository: SessionRepository | null = null;
let defaultAssetRepository: SessionAssetRepository | null = null;
let defaultDecisionRepository: DecisionRepository | null = null;

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

/** Lazily-created singleton session-asset repository used by the API layer. */
export function getDefaultSessionAssetRepository(): SessionAssetRepository {
  if (!defaultAssetRepository) {
    defaultAssetRepository = createSqliteSessionAssetRepository(
      getDefaultDbClient(),
    );
  }
  return defaultAssetRepository;
}

/** Lazily-created singleton decision repository used by the API layer. */
export function getDefaultDecisionRepository(): DecisionRepository {
  if (!defaultDecisionRepository) {
    defaultDecisionRepository = createSqliteDecisionRepository(
      getDefaultDbClient(),
    );
  }
  return defaultDecisionRepository;
}
