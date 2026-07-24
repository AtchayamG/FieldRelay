// Framework-agnostic application errors. The interface layer maps these onto
// HTTP status codes so the application/domain layers stay free of Nest.
export class CallValidationError extends Error {}
export class CallAuthorizationError extends Error {}

// A requested aggregate does not exist.
export class NotFoundError extends Error {}

// The same Idempotency-Key was replayed with a materially different request.
export class IdempotencyConflictError extends Error {}

// The same Idempotency-Key is still being processed by an earlier request.
// Retrying later is safe; retrying now would duplicate the side effect.
export class OperationInProgressError extends Error {}
