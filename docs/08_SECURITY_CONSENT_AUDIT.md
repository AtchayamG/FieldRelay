# Security, Consent and Audit Architecture

## 1. Security objective

FieldRelay performs real-world actions. Security must protect credentials, personal information, phone authorization, decision integrity and operational accountability.

## 2. Authentication

- OIDC or standards-based identity provider
- short-lived access tokens
- secure refresh-token handling
- MFA for privileged roles where supported
- session revocation
- device and login audit events

## 3. Authorization

Recommended roles:

- Operations Lead
- Dispatcher
- Property Manager
- Field Supervisor
- Auditor
- Organization Admin
- Read-only Judge/Demo User

Use policy checks at service boundaries. Hiding a button is not authorization.

Examples:

- only approved roles may start real calls
- only authorized approvers may approve spend
- transcript access may require an additional permission
- retention settings require admin rights
- judge account cannot add arbitrary phone numbers

## 4. Contact authorization

Phone contacts must include:

- authorization status
- allowed purposes
- source of authorization
- disclosure version
- effective and expiry dates
- revocation state

A contact without valid authorization cannot be called.

## 5. Secrets

- never expose CALL-E credentials to the client
- store secrets in environment/secret manager
- rotate credentials
- separate staging and production credentials
- do not log tokens or headers
- use signed webhook verification where available

## 6. Data minimization

Send only information required for the call purpose. Do not send passwords, access codes, payment-card data, medical details, or unrelated personal information.

## 7. Transcript handling

- retain raw transcript only when policy permits
- redact phone numbers and sensitive values
- store transcript reference separately from structured outcome
- restrict access
- support deletion or expiry according to policy
- record every transcript view/export

## 8. Audit model

Audit events are append-only. A material event includes:

- actor
- action
- target
- timestamp
- correlation ID
- source channel
- relevant decision evidence
- previous/new state summary
- integrity hash or signed record where feasible

## 9. Approval integrity

An approval decision must store:

- decision
- approver identity
- decision timestamp
- visible evidence version
- policy version
- optional comment
- amount/currency where applicable
- request and incident versions

Prevent duplicate or stale decisions.

## 10. Webhook and callback protection

- verify provider signature or secret
- reject old timestamps
- deduplicate by event ID
- process asynchronously
- store raw envelope for troubleshooting with redaction
- return success only after safe acceptance, not necessarily full processing

## 11. Common controls

- HTTPS only
- HSTS
- CSP
- secure cookies
- CSRF protection where cookie auth is used
- rate limiting
- input validation
- output encoding
- dependency scanning
- SAST and secret scanning
- database least privilege
- encrypted backups
- access logging

## 12. Demo/judge environment

- pre-created judge account
- safe number allowlist
- seeded contacts without real personal data
- clear “live call” confirmation before starting
- reset scenario action
- cost guardrail
- no admin or billing credentials
- stable environment until judging ends

## 13. Safety UX

Before a call, show:

- who will be called
- purpose
- authorization status
- disclosure policy
- expected information
- whether recording/transcription is enabled
- estimated cost/credit impact when known

For high-impact actions, require explicit confirmation.
