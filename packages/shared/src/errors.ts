import type { ApiError } from "./api/response";

/** Stable, machine-readable error codes exposed by the public API. */
export const ERROR_CODES = {
  ACTIVE_SESSION_EXISTS: "ACTIVE_SESSION_EXISTS",
  NO_ACTIVE_SESSION: "NO_ACTIVE_SESSION",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Factories for the structured errors used in story 1.1. */
export const apiErrors = {
  activeSessionExists: (): ApiError => ({
    code: ERROR_CODES.ACTIVE_SESSION_EXISTS,
    message: "Une session active existe deja.",
    status: 409,
  }),
  noActiveSession: (): ApiError => ({
    code: ERROR_CODES.NO_ACTIVE_SESSION,
    message: "Aucune session active.",
    status: 404,
  }),
  validation: (message = "Requete invalide."): ApiError => ({
    code: ERROR_CODES.VALIDATION_ERROR,
    message,
    status: 400,
  }),
  internal: (message = "Erreur interne."): ApiError => ({
    code: ERROR_CODES.INTERNAL_ERROR,
    message,
    status: 500,
  }),
};
