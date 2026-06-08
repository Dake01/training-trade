import type { SessionStatus } from "@training-trade/shared";

/**
 * Internal, persistence-facing session entity (camelCase). The DB layer maps
 * this to/from snake_case columns; the API layer maps it to the public DTO.
 */
export interface SessionRecord {
  id: string;
  status: SessionStatus;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
  openedAt: string;
  closedAt: string | null;
}

/** Injected clock so business rules and timestamps are deterministic in tests. */
export interface SessionClock {
  now(): Date;
}

/** Injected id generator so identifiers are deterministic in tests. */
export interface IdGenerator {
  generate(): string;
}

export interface SessionDeps {
  clock: SessionClock;
  ids: IdGenerator;
}

/** Transactional view of the store handed to exclusive operations. */
export interface SessionStore {
  findActive(): SessionRecord | null;
  findById(id: string): SessionRecord | null;
  insert(record: SessionRecord): void;
  /** Update an existing session in place; the `id` is never reassigned. */
  update(record: SessionRecord): void;
}

/**
 * Repository port. Implemented by packages/db (SQLite) in production and by
 * in-memory fakes in unit tests.
 */
export interface SessionRepository {
  findActive(): SessionRecord | null;
  findById(id: string): SessionRecord | null;
  /**
   * Runs `fn` with exclusive access so the "only one active session" invariant
   * is enforced atomically (a real transaction in the SQLite implementation).
   * Used by create, resume and close to read + write within one transaction.
   */
  transaction<T>(fn: (store: SessionStore) => T): T;
}
