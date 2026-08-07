import { Injectable } from '@nestjs/common';
import {
  AuthorizedContact,
  ContactAuthorizationPort
} from '../../application/contact-authorization.port';

// In-memory authorized-contact store for the demo slice. A real implementation
// resolves the encrypted phone token behind this same boundary; the interface
// layer only ever sees the identifier and authorization decision.
//
// The mix of entries here is deliberate rather than decorative. Between them
// they exercise every way a call can be refused before it is placed:
//
//   CNS-4491  authorized for two purposes  -> the happy path
//   CNS-7712  authorized for one purpose   -> refused for the other two
//   CNS-0000  revoked                      -> refused for everything
//   CNS-5530  pending                      -> not yet authorized, refused
//
// A Vendors screen showing only working contacts would prove nothing.
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
      'CNS-7712',
      {
        contactId: 'CNS-7712',
        authorizationStatus: 'authorized',
        allowedPurposes: ['status_update']
      }
    ],
    [
      'CNS-5530',
      {
        contactId: 'CNS-5530',
        authorizationStatus: 'pending',
        allowedPurposes: []
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

  async list(): Promise<AuthorizedContact[]> {
    return [...this.contacts.values()];
  }
}
