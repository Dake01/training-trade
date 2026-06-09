import { systemSessionDeps } from "../sessions/deps";
import type { SessionDeps } from "../sessions/types";

/**
 * Decision capture needs the same injected clock + id generator as the session
 * rules (deterministic in tests, system-backed in production), so it reuses the
 * shared `SessionDeps` contract rather than duplicating a parallel one.
 */
export type DecisionDeps = SessionDeps;

/** Production dependencies for decision capture: system clock + random UUIDs. */
export const systemDecisionDeps: DecisionDeps = systemSessionDeps;
