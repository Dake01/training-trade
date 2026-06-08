import { isActiveStatus } from "@training-trade/shared";
import type { Session, SessionContext } from "@training-trade/shared";
import type { SessionRecord } from "./types";

/** Map an internal record to the full public session DTO. */
export function toSession(record: SessionRecord): Session {
  return {
    id: record.id,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    openedAt: record.openedAt,
    closedAt: record.closedAt,
    canReceiveDecisions: isActiveStatus(record.status),
  };
}

/** Map an internal record to the minimal active-session context. */
export function toSessionContext(record: SessionRecord): SessionContext {
  return {
    id: record.id,
    status: record.status,
    openedAt: record.openedAt,
    canReceiveDecisions: isActiveStatus(record.status),
  };
}
