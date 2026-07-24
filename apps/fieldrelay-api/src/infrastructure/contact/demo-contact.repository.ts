import { Injectable } from '@nestjs/common';
import {
  AuthorizedContact,
  ContactAuthorizationPort
} from '../../application/contact-authorization.port';

// In-memory authorized-contact store for the demo slice. A real implementation
// resolves the encrypted phone token behind this same boundary; the interface
// layer only ever sees the identifier and authorization decision.
// ponytail: seeded map, swap for a real repository when persistence lands.
@Injectable()
export class DemoContactRepository implements ContactAuthorizationPort {
  private readonly contacts = new Map<string, AuthorizedContact>([
    [
      'CNS-4491',
      {
        contactId: 'CNS-4491',
        authorizationStatus: 'authorized',
        allowedPurposes: ['vendor_availability', 'appointment_confirmation']
      }
    ],
    [
      'CNS-0000',
      {
        contactId: 'CNS-0000',
        authorizationStatus: 'revoked',
        allowedPurposes: []
      }
    ]
  ]);

  async resolve(contactId: string): Promise<AuthorizedContact | null> {
    return this.contacts.get(contactId) ?? null;
  }
}
