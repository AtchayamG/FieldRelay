import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CallEController, HealthController } from './interfaces/call-e.controller';
import { IncidentController } from './interfaces/incident.controller';
import { ProviderCallbackController } from './interfaces/provider-callback.controller';
import { CalleWebhookController } from './interfaces/calle-webhook.controller';
import { AuthController } from './interfaces/auth.controller';
import { SessionGuard } from './interfaces/session.guard';
import { IssueSessionUseCase } from './application/issue-session.use-case';
import { requireSigningSecret } from './application/session-token';
import { SettingsController } from './interfaces/settings.controller';
import { CallUsageController } from './interfaces/call-usage.controller';
import { ApprovalController } from './interfaces/approval.controller';
import { MissionControlController } from './interfaces/mission-control.controller';
import { GetMissionControlUseCase } from './application/get-mission-control.use-case';
import { ListApprovalsUseCase } from './application/list-approvals.use-case';
import { DecideApprovalUseCase } from './application/decide-approval.use-case';
import { DispatchController } from './interfaces/dispatch.controller';
import { VendorController } from './interfaces/vendor.controller';
import { ListVendorsUseCase } from './application/list-vendors.use-case';
import { InsightsController } from './interfaces/insights.controller';
import { GetAnalyticsUseCase } from './application/get-analytics.use-case';
import { ListTechniciansUseCase } from './application/list-technicians.use-case';
import {
  AdvanceDispatchUseCase,
  ListDispatchesUseCase,
  ReleaseDispatchUseCase
} from './application/dispatch.use-cases';
import {
  GetCallUsageUseCase,
  readPriorCallCount
} from './application/get-call-usage.use-case';
import { ManageDialTargetUseCase } from './application/manage-dial-target.use-case';
import {
  DIAL_TARGET_SETTINGS_PORT,
  DialTargetSettingsPort
} from './application/dial-target-settings.port';
import { DIAL_TARGET_PORT, DialTargetResolverPort } from './application/dial-target.port';
import { PgDialTargetSettingsRepository } from './infrastructure/persistence/pg/pg-dial-target-settings.repository';
import { LayeredDialTargetResolver } from './infrastructure/contact/layered-dial-target.resolver';
import { ApiExceptionFilter } from './interfaces/api-exception.filter';
import { StartCallUseCase } from './application/start-call.use-case';
import { ListCallsUseCase } from './application/list-calls.use-case';
import { GetCallUseCase } from './application/get-call.use-case';
import { ProcessProviderCallbackUseCase } from './application/process-provider-callback.use-case';
import { ReconcileStaleReservationsUseCase } from './application/reconcile-stale-reservations.use-case';
import { CreateIncidentUseCase } from './application/create-incident.use-case';
import { ListIncidentsUseCase } from './application/list-incidents.use-case';
import { GetIncidentUseCase } from './application/get-incident.use-case';
import { CheckHealthUseCase } from './application/check-health.use-case';
import { CallEPort, CALL_E_PORT } from './application/call-e.port';
import {
  ContactAuthorizationPort,
  CONTACT_AUTH_PORT
} from './application/contact-authorization.port';
import { TransactionPort, TRANSACTION_PORT } from './application/persistence.port';
import { DemoCallEAdapter } from './infrastructure/call-e/demo-call-e.adapter';
import {
  CalleApiAdapter,
  readCalleConfigFromEnv
} from './infrastructure/call-e/calle-api.adapter';
import {
  CALLE_WEBHOOK_TRANSLATOR,
  CalleWebhookTranslator
} from './infrastructure/call-e/calle-webhook.translator';
import { DemoContactRepository } from './infrastructure/contact/demo-contact.repository';
import { EnvDialTargetResolver } from './infrastructure/contact/env-dial-target.resolver';
import {
  PgPoolProvider,
  PgTransactionManager
} from './infrastructure/persistence/pg/pg-unit-of-work';

// CALL-E is only ever live when the deployment says so explicitly. Any value
// other than "live" — including an unset variable, a typo, or an empty string —
// selects the demo adapter, so no environment can start dialling by accident.
export function selectCallEAdapter(
  env: NodeJS.ProcessEnv,
  dialTargets: DialTargetResolverPort = new EnvDialTargetResolver()
): CallEPort {
  if (env.CALL_E_MODE !== 'live') {
    return new DemoCallEAdapter();
  }
  // Throws at boot when the live configuration is missing or unsafe, rather
  // than at the first attempted call.
  return new CalleApiAdapter(readCalleConfigFromEnv(env), dialTargets);
}

// Off unless a deployment explicitly turns it on, so the published demo
// credentials can never be used to point a public judge environment at an
// arbitrary telephone.
export function runtimeDialTargetChangesAllowed(env: NodeJS.ProcessEnv): boolean {
  return (env.CALLE_ALLOW_RUNTIME_DIAL_TARGET ?? '').trim().toLowerCase() === 'true';
}

@Module({
  controllers: [
    CallEController,
    HealthController,
    IncidentController,
    ProviderCallbackController,
    CalleWebhookController,
    AuthController,
    SettingsController,
    CallUsageController,
    ApprovalController,
    DispatchController,
    VendorController,
    InsightsController,
    MissionControlController
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },

    // Registered globally so every route is closed unless it opts out with
    // @PublicRoute(). Adding a controller without thinking about auth yields a
    // locked route, not an open one.
    { provide: APP_GUARD, useClass: SessionGuard },
    {
      provide: IssueSessionUseCase,
      useFactory: () =>
        new IssueSessionUseCase(
          {
            // Published evaluator credentials: judges must be able to sign in
            // without being handed a secret out of band. What protects the call
            // budget on a public deployment is CALL_E_MODE, not this password.
            email: process.env.DEMO_OPERATOR_EMAIL ?? 'ops.demo@fieldrelay.io',
            password: process.env.DEMO_OPERATOR_PASSWORD ?? 'DemoOps2026!'
          },
          requireSigningSecret(process.env.AUTH_SIGNING_SECRET)
        )
    },

    // Persistence is PostgreSQL, always. PgPoolProvider reads DATABASE_URL and
    // throws when it is missing, so the process fails at boot rather than
    // serving requests against volatile state. The in-memory unit of work under
    // infrastructure/persistence/memory is test-only and is not wired here.
    PgPoolProvider,
    {
      provide: TRANSACTION_PORT,
      useFactory: (pools: PgPoolProvider) => new PgTransactionManager(pools.pool),
      inject: [PgPoolProvider]
    },

    PgDialTargetSettingsRepository,
    {
      provide: DIAL_TARGET_SETTINGS_PORT,
      useExisting: PgDialTargetSettingsRepository
    },
    {
      // The operator-nominated number wins over the environment allowlist, and
      // a contact present in neither is simply not callable.
      provide: DIAL_TARGET_PORT,
      useFactory: (settings: DialTargetSettingsPort) =>
        new LayeredDialTargetResolver(settings, new EnvDialTargetResolver()),
      inject: [DIAL_TARGET_SETTINGS_PORT]
    },
    {
      provide: CALL_E_PORT,
      useFactory: (dialTargets: DialTargetResolverPort) =>
        selectCallEAdapter(process.env, dialTargets),
      inject: [DIAL_TARGET_PORT]
    },
    { provide: CONTACT_AUTH_PORT, useClass: DemoContactRepository },
    {
      // Reads the authorization boundary for display. It asks the dial-target
      // resolver only whether a number exists, never what it is.
      provide: ListVendorsUseCase,
      useFactory: (contacts: ContactAuthorizationPort, dialTargets: DialTargetResolverPort) =>
        new ListVendorsUseCase(contacts, dialTargets),
      inject: [CONTACT_AUTH_PORT, DIAL_TARGET_PORT]
    },
    {
      provide: GetAnalyticsUseCase,
      useFactory: (transactions: TransactionPort) => new GetAnalyticsUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ListTechniciansUseCase,
      useFactory: (transactions: TransactionPort) => new ListTechniciansUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: GetMissionControlUseCase,
      useFactory: (transactions: TransactionPort) =>
        new GetMissionControlUseCase(
          transactions,
          readPriorCallCount(process.env.CALLE_CALLS_PLACED_ELSEWHERE),
          process.env.CALL_E_MODE === 'live' ? 'live' : 'demo',
          runtimeDialTargetChangesAllowed(process.env)
        ),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ListApprovalsUseCase,
      useFactory: (transactions: TransactionPort) => new ListApprovalsUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: DecideApprovalUseCase,
      useFactory: (transactions: TransactionPort) => new DecideApprovalUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ListDispatchesUseCase,
      useFactory: (transactions: TransactionPort) => new ListDispatchesUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ReleaseDispatchUseCase,
      useFactory: (transactions: TransactionPort) => new ReleaseDispatchUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: AdvanceDispatchUseCase,
      useFactory: (transactions: TransactionPort) => new AdvanceDispatchUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: GetCallUsageUseCase,
      useFactory: (transactions: TransactionPort) =>
        new GetCallUsageUseCase(
          transactions,
          // Calls made against the same CALL-E account from outside this
          // deployment — the CLI and the local proof run — which this database
          // has no record of. Counting them keeps the displayed total honest.
          readPriorCallCount(process.env.CALLE_CALLS_PLACED_ELSEWHERE),
          process.env.CALL_E_MODE === 'live' ? 'live' : 'demo'
        ),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ManageDialTargetUseCase,
      useFactory: (
        settings: DialTargetSettingsPort,
        contacts: ContactAuthorizationPort,
        transactions: TransactionPort
      ) =>
        new ManageDialTargetUseCase(
          settings,
          contacts,
          transactions,
          runtimeDialTargetChangesAllowed(process.env)
        ),
      inject: [DIAL_TARGET_SETTINGS_PORT, CONTACT_AUTH_PORT, TRANSACTION_PORT]
    },
    { provide: CALLE_WEBHOOK_TRANSLATOR, useFactory: () => new CalleWebhookTranslator() },

    // Factories keep the use cases plain classes free of Nest decorators.
    {
      provide: StartCallUseCase,
      useFactory: (
        callE: CallEPort,
        contacts: ContactAuthorizationPort,
        transactions: TransactionPort
      ) => new StartCallUseCase(callE, contacts, transactions),
      inject: [CALL_E_PORT, CONTACT_AUTH_PORT, TRANSACTION_PORT]
    },
    {
      provide: ProcessProviderCallbackUseCase,
      useFactory: (transactions: TransactionPort) =>
        new ProcessProviderCallbackUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ReconcileStaleReservationsUseCase,
      useFactory: (transactions: TransactionPort) =>
        new ReconcileStaleReservationsUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ListCallsUseCase,
      useFactory: (transactions: TransactionPort) => new ListCallsUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: GetCallUseCase,
      useFactory: (transactions: TransactionPort) => new GetCallUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: CreateIncidentUseCase,
      useFactory: (transactions: TransactionPort) => new CreateIncidentUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: ListIncidentsUseCase,
      useFactory: (transactions: TransactionPort) => new ListIncidentsUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: GetIncidentUseCase,
      useFactory: (transactions: TransactionPort) => new GetIncidentUseCase(transactions),
      inject: [TRANSACTION_PORT]
    },
    {
      provide: CheckHealthUseCase,
      useFactory: (transactions: TransactionPort) => new CheckHealthUseCase(transactions),
      inject: [TRANSACTION_PORT]
    }
  ]
})
export class AppModule {}
