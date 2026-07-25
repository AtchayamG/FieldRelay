import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CallEController, HealthController } from './interfaces/call-e.controller';
import { IncidentController } from './interfaces/incident.controller';
import { ProviderCallbackController } from './interfaces/provider-callback.controller';
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
import { DemoContactRepository } from './infrastructure/contact/demo-contact.repository';
import {
  PgPoolProvider,
  PgTransactionManager
} from './infrastructure/persistence/pg/pg-unit-of-work';

@Module({
  controllers: [CallEController, HealthController, IncidentController, ProviderCallbackController],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },

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

    { provide: CALL_E_PORT, useClass: DemoCallEAdapter },
    { provide: CONTACT_AUTH_PORT, useClass: DemoContactRepository },

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
