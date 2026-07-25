// Framework-agnostic application errors. The interface layer maps these onto
// HTTP status codes so the application/domain layers stay free of Nest.
export class CallValidationError extends Error {}
export class CallAuthorizationError extends Error {}
export class CallbackAuthenticationError extends Error {}

// No usable caller identity: the session token is absent, malformed, expired,
// or wrongly signed. Distinct from CallAuthorizationError, which means the
// caller is known but is not permitted to do this particular thing.
export class AuthenticationError extends Error {}

// The call provider was reachable but refused or failed the request, or was not
// reachable at all. Thrown by CallEPort implementations; StartCallUseCase turns
// it into a durable `outcome_unknown` task that can never be auto-redialled.
export class CallProviderError extends Error {}

// The server is configured to place live calls but the configuration is
// missing, malformed, or unsafe. Raised at construction time so the process
// fails at boot rather than at the first attempted call.
export class CallProviderConfigurationError extends Error {}

// A requested aggregate does not exist.
export class NotFoundError extends Error {}

// The same Idempotency-Key was replayed with a materially different request.
export class IdempotencyConflictError extends Error {}

// The same Idempotency-Key is still being processed by an earlier request.
// Retrying later is safe; retrying now would duplicate the side effect.
export class OperationInProgressError extends Error {}
