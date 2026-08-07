import { ListVendorsUseCase } from '../application/list-vendors.use-case';
import type {
  AuthorizedContact,
  ContactAuthorizationPort
} from '../application/contact-authorization.port';
import type { DialTargetResolverPort } from '../application/dial-target.port';

// This screen exists to make two refusals legible without an operator having to
// trigger a failure to see them. These tests hold it to that, and to the rule
// that the phone number never crosses out of infrastructure.

const CONTACTS: AuthorizedContact[] = [
  {
    contactId: 'CNS-4491',
    authorizationStatus: 'authorized',
    allowedPurposes: ['vendor_availability', 'appointment_confirmation']
  },
  { contactId: 'CNS-7712', authorizationStatus: 'authorized', allowedPurposes: ['status_update'] },
  { contactId: 'CNS-5530', authorizationStatus: 'pending', allowedPurposes: [] },
  { contactId: 'CNS-0000', authorizationStatus: 'revoked', allowedPurposes: [] }
];

function build(provisioned: string[]) {
  const contacts: ContactAuthorizationPort = {
    list: async () => CONTACTS,
    resolve: async (id) => CONTACTS.find((c) => c.contactId === id) ?? null
  };
  const dialTargets: DialTargetResolverPort = {
    resolve: async (id) =>
      provisioned.includes(id) ? { phoneE164: '+919999900000', region: 'IN', locale: 'en-IN' } : null
  };
  return new ListVendorsUseCase(contacts, dialTargets);
}

describe('ListVendorsUseCase', () => {
  it('reports what each contact is refused for, not only what it allows', async () => {
    const rows = await (await build(['CNS-4491'])).execute();
    const limited = rows.find((r) => r.contactId === 'CNS-7712');

    expect(limited?.allowedPurposes).toEqual(['status_update']);
    // The gap is the point: this contact exists and is authorized, and still
    // cannot be called about a vendor's availability.
    expect(limited?.refusedPurposes).toEqual([
      'vendor_availability',
      'appointment_confirmation'
    ]);
  });

  it('never returns a phone number, only whether one exists', async () => {
    const rows = await (await build(['CNS-4491'])).execute();

    expect(JSON.stringify(rows)).not.toContain('9999900000');
    expect(JSON.stringify(rows)).not.toContain('+91');
    expect(rows.find((r) => r.contactId === 'CNS-4491')?.numberProvisioned).toBe(true);
  });

  it('treats an authorized contact with no provisioned number as not callable', async () => {
    // Authorization alone reaches nobody. This is the refusal that is hardest
    // to see, because nothing visibly fails until a call is attempted.
    const rows = await (await build([])).execute();
    const authorized = rows.find((r) => r.contactId === 'CNS-4491');

    expect(authorized?.authorizationStatus).toBe('authorized');
    expect(authorized?.numberProvisioned).toBe(false);
    expect(authorized?.callable).toBe(false);
  });

  it('treats a provisioned number on a revoked contact as not callable', async () => {
    // The inverse, and the one the system exists to refuse: a number is
    // present, and it still must not be dialled.
    const rows = await (await build(['CNS-0000'])).execute();
    const revoked = rows.find((r) => r.contactId === 'CNS-0000');

    expect(revoked?.numberProvisioned).toBe(true);
    expect(revoked?.callable).toBe(false);
  });

  it('treats a pending contact as not callable even with a number', async () => {
    const rows = await (await build(['CNS-5530'])).execute();
    expect(rows.find((r) => r.contactId === 'CNS-5530')?.callable).toBe(false);
  });

  it('marks callable only when authorized, purposed and provisioned', async () => {
    const rows = await (await build(['CNS-4491', 'CNS-7712', 'CNS-5530', 'CNS-0000'])).execute();
    const callable = rows.filter((r) => r.callable).map((r) => r.contactId);

    expect(callable.sort()).toEqual(['CNS-4491', 'CNS-7712']);
  });
});
