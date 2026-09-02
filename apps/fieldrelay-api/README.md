# FieldRelay API

NestJS interface adapters around framework-free application and domain code.
PostgreSQL is required at runtime; the API deliberately has no volatile
production fallback.

## Local development

From the repository root:

```powershell
docker compose up -d postgres
$env:DATABASE_URL = 'postgresql://fieldrelay:fieldrelay_local_dev@127.0.0.1:5432/fieldrelay'
pnpm --filter fieldrelay-api build
pnpm --filter fieldrelay-api start
```

The Compose database applies `infra/database/migrations/0001_incidents.sql`
and deterministic fictional seed data on first initialization. For an existing
database, apply pending migrations explicitly:

```powershell
$env:DATABASE_URL = 'postgresql://fieldrelay:fieldrelay_local_dev@127.0.0.1:5432/fieldrelay'
pnpm --filter fieldrelay-api db:migrate
```

The development credentials above are safe only for the loopback-bound local
container. Real environments must inject `DATABASE_URL` from a secret store and
require TLS in the connection string.

## Verification

```powershell
pnpm --filter fieldrelay-api test --runInBand
pnpm --filter fieldrelay-api typecheck
pnpm --filter fieldrelay-api build
```

Set `DATABASE_URL` before the test command to include the PostgreSQL integration
suite. Without it, the SQL-specific suite is intentionally skipped.

`CALL_E_MODE` selects the provider. Any value except the exact string `live`
uses the visibly simulated demo adapter; only exact live mode reads CALL-E
credentials and can place an authorized call. `POST /api/v1/calls/:id/reconcile`
is a separate read-only recovery action: it checks one already-created live
provider task and can never create, retry, or redial a call.
