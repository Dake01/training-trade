import type {
  SessionDeps,
  SessionRecord,
  SessionRepository,
  SessionStore,
} from "../types";

/** In-memory SessionRepository used to unit test pure business rules. */
export function createFakeSessionRepository(
  initial: SessionRecord[] = [],
): SessionRepository {
  const rows: SessionRecord[] = [...initial];
  const store: SessionStore = {
    findActive: () => rows.find((row) => row.status === "open") ?? null,
    findById: (id) => rows.find((row) => row.id === id) ?? null,
    insert: (record) => {
      rows.push(record);
    },
    update: (record) => {
      const index = rows.findIndex((row) => row.id === record.id);
      if (index === -1) {
        throw new Error(`Unknown session ${record.id}`);
      }
      rows[index] = record;
    },
  };
  return {
    findActive: () => store.findActive(),
    findById: (id) => store.findById(id),
    transaction: (fn) => fn(store),
  };
}

/** Deterministic deps: fixed clock and a queue of ids. */
export function fixedDeps(options?: {
  iso?: string;
  ids?: string[];
}): SessionDeps {
  const iso = options?.iso ?? "2026-06-08T14:00:00.000Z";
  const ids = [...(options?.ids ?? ["id-1", "id-2", "id-3"])];
  let cursor = 0;
  return {
    clock: { now: () => new Date(iso) },
    ids: { generate: () => ids[cursor++] ?? `id-${cursor}` },
  };
}
