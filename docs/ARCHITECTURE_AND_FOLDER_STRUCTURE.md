# Architecture and Folder Structure

**Status:** Selected foundation architecture  
**Authority:** Implements `00_MASTER_BLUEPRINT.md` through `08_SECURITY_CONSENT_AUDIT.md`

## Decision

FieldRelay is a TypeScript monorepo with an Ionic Angular PWA/Capacitor client, a NestJS API, and shared contracts. Each business capability owns its domain, application, data/infrastructure, and presentation/interface code. Dependencies point inward.

```text
apps/
  fieldrelay-app/
    src/
      app/
        core/                 # auth, config, HTTP, errors, logging, platform
        layout/               # responsive shell and navigation
        shared/               # genuinely reusable UI/accessibility primitives
        features/
          incidents/
            domain/
            application/
            data/
            presentation/
          calls/
          approvals/
          dispatch/
          mission-control/
          technicians/
          vendors/
          customers/
          analytics/
          audit-consent/
          knowledge-base/
          settings/
        integrations/         # client-safe realtime/notification adapters
        theme/
        environments/
      assets/
      tests/
    capacitor.config.ts
  fieldrelay-api/
    src/
      core/                   # config, errors, auth, logging, validation
      domain/                 # entities, value objects, domain services/events
      application/            # use cases and outbound ports
      infrastructure/         # persistence, queue, realtime, audit implementations
      interfaces/             # HTTP controllers, webhook handlers, DTOs
      integrations/
        call-e/               # production and explicit demo adapters
      config/
      tests/
packages/
  contracts/                  # transport contracts only
  design-tokens/              # generated CSS/TypeScript from the canonical JSON
  testing/                    # deterministic fixtures and test builders
docs/
scripts/
mockups/
mockup_specs/
```

## Boundary rules

- Domain owns business state and invariants and has no framework imports.
- Application use cases coordinate domain objects through ports.
- Infrastructure and data layers implement ports and perform mapping.
- Controllers/pages translate external DTOs and view models; API response shapes never leak into domain or templates.
- CALL-E is an application port with production and demo adapters. Provider task state is mapped to FieldRelay state centrally.
- Feature presentation state stays with the feature. Shared code must have at least two real consumers.
- Cross-feature operations use application use cases or domain events, not imports between page components.

## Initial vertical slice

The first complete slice is: judge/demo sign-in -> incident creation -> incident detail -> authorized vendor call request -> provider/demo status -> validated quote -> human approval -> dispatch -> audit timeline. Supporting pages follow only after this path is executable.

## Architectural checks

- TypeScript strict mode and path aliases.
- ESLint dependency-boundary rules once packages exist.
- Contract, use-case, adapter, controller, and browser-flow tests.
- No client bundle contains server environment names or CALL-E secrets.
- Demo adapter is opt-in and labels every simulated event.
- Repository and CI commands operate from the workspace root.

## Deliberate limits

Do not introduce a broker, distributed queue, object storage, or separate worker process until the in-process port implementation and persistence-backed job model are working. Their interfaces remain replaceable without speculative infrastructure.
