// Framework-agnostic application errors. The interface layer maps these onto
// HTTP status codes so the application/domain layers stay free of Nest.
export class CallValidationError extends Error {}
export class CallAuthorizationError extends Error {}
