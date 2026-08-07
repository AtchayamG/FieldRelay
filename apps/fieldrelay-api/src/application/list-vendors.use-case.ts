import type { CallPurpose } from '../domain/call-task.entity';
import type { AuthorizedContact, ContactAuthorizationPort } from './contact-authorization.port';
import type { DialTargetResolverPort } from './dial-target.port';

export const ALL_PURPOSES: readonly CallPurpose[] = [
  'vendor_availability',
  'appointment_confirmation',
  'status_update'
];

export interface VendorView {
  contactId: string;
  authorizationStatus: AuthorizedContact['authorizationStatus'];
  allowedPurposes: CallPurpose[];
  // Purposes this contact exists for but is NOT cleared to be called about.
  // Rendering the gap is the point of the screen: an operator should be able to
  // see what the system will refuse without having to attempt it.
  refusedPurposes: CallPurpose[];
  // Whether a number has been provisioned for this contact. A boolean, never
  // the number. An authorized contact with no provisioned number still cannot
  // be reached, and that is a state worth seeing.
  numberProvisioned: boolean;
  // Whether this contact can be called for anything at all, right now.
  callable: boolean;
}

// Reads the authorization boundary out loud.
//
// "FieldRelay will not dial a number nobody provisioned" and "a contact
// authorized for one purpose cannot be called about another" are the two
// refusals that are hardest to demonstrate, because working software simply
// does not do the thing. This use case exists so the boundary is legible
// without an operator having to trigger a failure to see it.
//
// It reads the dial-target resolver only to ask "is there a number?", and
// discards the answer's contents immediately. The phone number never crosses
// out of infrastructure.
export class ListVendorsUseCase {
  constructor(
    private readonly contacts: ContactAuthorizationPort,
    private readonly dialTargets: DialTargetResolverPort
  ) {}

  public async execute(): Promise<VendorView[]> {
    const contacts = await this.contacts.list();

    return Promise.all(
      contacts.map(async (contact) => {
        const allowed = [...contact.allowedPurposes];
        const target = await this.dialTargets.resolve(contact.contactId);
        // Coerced to a boolean on this line, deliberately. Nothing downstream
        // is given the opportunity to read a digit.
        const numberProvisioned = target !== null;

        return {
          contactId: contact.contactId,
          authorizationStatus: contact.authorizationStatus,
          allowedPurposes: allowed,
          refusedPurposes: ALL_PURPOSES.filter((purpose) => !allowed.includes(purpose)),
          numberProvisioned,
          // Both conditions, because either alone is not enough. Authorization
          // without a number reaches nobody; a number without authorization is
          // exactly what the system exists to refuse.
          callable:
            contact.authorizationStatus === 'authorized' &&
            allowed.length > 0 &&
            numberProvisioned
        };
      })
    );
  }
}
