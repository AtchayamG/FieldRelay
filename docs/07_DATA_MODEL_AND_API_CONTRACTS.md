# Data Model and API Contracts

## 1. Core identifiers

Use UUIDs or ULIDs internally. Human-readable IDs may be generated for display:

```text
INC-2042-0891
CALL-E-7742
APR-9384
DSP-5512
CNS-4491
```

Display IDs are not database primary keys.

## 2. Core entities

### Organization

- id
- name
- timezone
- currency
- theme default
- operational policies
- createdAt

### User

- id
- organizationId
- name
- email
- roleIds
- status
- lastLoginAt

### Property

- id
- organizationId
- name
- address
- region
- timezone
- access instructions
- emergency policy

### Contact

- id
- propertyId
- type
- name
- phone token / encrypted phone
- preferred channel
- language
- authorization status

### Incident

- id
- displayId
- propertyId
- unit
- type
- subtype
- priority
- status
- description
- reportedBy
- assignedVendorId
- assignedTechnicianId
- slaDueAt
- createdAt
- resolvedAt
- version

### WorkflowInstance

- id
- incidentId
- workflowDefinitionVersion
- state
- currentStep
- retryCount
- context JSON
- startedAt
- completedAt
- version

### CallTask

- id
- workflowId
- provider
- providerTaskId
- purpose
- contactId
- status
- startedAt
- connectedAt
- completedAt
- failureCode
- rawOutcomeRef

### CallOutcome

- id
- callTaskId
- schemaVersion
- structuredData JSON
- confidence
- validationStatus
- reviewedBy
- reviewedAt

### Approval

- id
- incidentId
- workflowId
- type
- requestedAmount
- currency
- reason
- evidence JSON
- status
- requestedBy
- decidedBy
- decidedAt

### Dispatch

- id
- incidentId
- vendorId
- technicianId
- status
- estimatedArrivalAt
- actualArrivalAt
- estimatedCost
- scheduledWindow

### Commitment

- id
- incidentId
- callTaskId
- actorType
- actorId
- description
- dueAt
- status
- verifiedAt

### ConsentRecord

- id
- contactId
- purpose
- status
- disclosureVersion
- grantedAt
- expiresAt
- evidenceRef

### AuditEvent

- id
- organizationId
- actorType
- actorId
- action
- entityType
- entityId
- correlationId
- metadata JSON
- integrityHash
- createdAt

## 3. API endpoints

### Incidents

```text
GET    /api/v1/incidents
POST   /api/v1/incidents
GET    /api/v1/incidents/:id
PATCH  /api/v1/incidents/:id
POST   /api/v1/incidents/:id/workflows
POST   /api/v1/incidents/:id/resolve
```

### Calls

```text
GET    /api/v1/calls
GET    /api/v1/calls/:id
POST   /api/v1/calls/:id/cancel
POST   /api/v1/calls/:id/retry
GET    /api/v1/calls/:id/transcript
GET    /api/v1/calls/:id/outcome
```

### Approvals

```text
GET    /api/v1/approvals
GET    /api/v1/approvals/:id
POST   /api/v1/approvals/:id/approve
POST   /api/v1/approvals/:id/reject
POST   /api/v1/approvals/:id/request-changes
```

### Dispatch

```text
GET    /api/v1/dispatch/board
POST   /api/v1/dispatch
PATCH  /api/v1/dispatch/:id
POST   /api/v1/dispatch/:id/check-in
POST   /api/v1/dispatch/:id/complete
```

### Vendors and technicians

```text
GET    /api/v1/vendors
GET    /api/v1/vendors/:id
GET    /api/v1/technicians
GET    /api/v1/technicians/:id
GET    /api/v1/availability
```

### Audit and consent

```text
GET    /api/v1/audit-events
GET    /api/v1/consents
POST   /api/v1/consents
POST   /api/v1/consents/:id/revoke
```

## 4. Standard response envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_01...",
    "timestamp": "2026-07-24T10:41:24Z"
  }
}
```

## 5. Error contract

```json
{
  "error": {
    "code": "APPROVAL_ALREADY_DECIDED",
    "message": "This approval has already been decided.",
    "details": {},
    "requestId": "req_01..."
  }
}
```

## 6. Idempotency

Require `Idempotency-Key` for:

- incident creation
- workflow start
- call start
- approval decision
- dispatch creation
- completion confirmation

## 7. Pagination

Prefer cursor pagination for live operational lists. Support stable sorting and filter echo in metadata.

## 8. Concurrency

Incident, workflow, approval and dispatch updates must include a version or ETag. Reject stale updates with a clear conflict response.
