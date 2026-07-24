import { Module } from '@nestjs/common';
import { CallEController, HealthController } from './interfaces/call-e.controller';
import { StartCallUseCase } from './application/start-call.use-case';
import { CallEPort, CALL_E_PORT } from './application/call-e.port';
import {
  ContactAuthorizationPort,
  CONTACT_AUTH_PORT
} from './application/contact-authorization.port';
import { DemoCallEAdapter } from './infrastructure/call-e/demo-call-e.adapter';
import { DemoContactRepository } from './infrastructure/contact/demo-contact.repository';

@Module({
  controllers: [CallEController, HealthController],
  providers: [
    { provide: CALL_E_PORT, useClass: DemoCallEAdapter },
    { provide: CONTACT_AUTH_PORT, useClass: DemoContactRepository },
    {
      // Factory keeps StartCallUseCase a plain class free of Nest decorators.
      provide: StartCallUseCase,
      useFactory: (callE: CallEPort, contacts: ContactAuthorizationPort) =>
        new StartCallUseCase(callE, contacts),
      inject: [CALL_E_PORT, CONTACT_AUTH_PORT]
    }
  ]
})
export class AppModule {}
