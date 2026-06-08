import type { SessionDeps } from "./types";

/** Production dependencies: system clock + cryptographically-random UUIDs. */
export const systemSessionDeps: SessionDeps = {
  clock: { now: () => new Date() },
  ids: { generate: () => crypto.randomUUID() },
};
