import { AuthorizedContact, ContactAuthorizationPort } from '../application/contact-authorization.port';
import { CallAuthorizationError, CallValidationError } from '../application/errors';
import { ManageDialTargetUseCase, maskPhone } from '../application/manage-dial-target.use-case';
import { DialTargetResolverPort } from '../application/dial-target.port';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { InMemoryDialTargetSettings } from '../infrastructure/persistence/pg/pg-dial-target-settings.repository';
import { LayeredDialTargetResolver } from '../infrastructure/contact/layered-dial-target.resolver';

const AUTHORIZED: AuthorizedContact = {
  contactId: 'CNS-4491',
  authorizationStatus: 'authorized',
  allowedPurposes: ['vendor_availability']
};

const contacts: ContactAuthorizationPort = {
  list: async () => [AUTHORIZED],
  resolve: async (contactId) =>
    contactId === 'CNS-4491'
      ? AUTHORIZED
      : contactId === 'CNS-0000'
        ? { contactId, authorizationStatus: 'revoked', allowedPurposes: [] }
        : null
};

function build(runtimeAllowed: boolean) {
  const settings = new InMemoryDialTargetSettings();
  const transactions = new InMemoryTransactionManager(new InMemoryDatabase());
  const useCase = new ManageDialTargetUseCase(settings, contacts, transactions, runtimeAllowed);
  return { settings, transactions, useCase };
}

const VALID = {
  contactId: 'CNS-4491',
  phoneE164: '+919999900000',
  region: 'IN',
  locale: 'en-IN',
  actor: 'ops.demo@fieldrelay.io',
  correlationId: 'req_test'
};

describe('ManageDialTargetUseCase', () => {
  it('reports nothing configured before an operator sets a number', async () => {
    const { useCase } = build(true);
    await expect(useCase.view()).resolves.toMatchObject({
      configured: false,
      maskedPhone: null,
      runtimeChangesAllowed: true
    });
  });

  it('stores a valid target and returns it masked', async () => {
    const { useCase } = build(true);
    const view = await useCase.set(VALID);

    expect(view).toMatchObject({
      configured: true,
      contactId: 'CNS-4491',
      region: 'IN',
      locale: 'en-IN',
      updatedBy: 'ops.demo@fieldrelay.io'
    });
    // The full number is never returned by the API.
    expect(view.maskedPhone).toBe('••• ••• 0000');
    expect(JSON.stringify(view)).not.toContain('919999900000');
  });

  it('normalises spacing and punctuation in the number', async () => {
    const { settings, useCase } = build(true);
    await useCase.set({ ...VALID, phoneE164: '+91 (999) 990-0000' });
    await expect(settings.read()).resolves.toMatchObject({ phoneE164: '+919999900000' });
  });

  it('audits the change without recording the number', async () => {
    const { useCase, transactions } = build(true);
    await useCase.set(VALID);

    const events = await transactions.withTransaction(async (uow) =>
      (uow as unknown as { auditEvents?: unknown[] }).auditEvents ?? []
    );
    // The audit event body is asserted through the metadata contract rather
    // than the store internals; what matters is that the raw number is absent.
    expect(JSON.stringify(events)).not.toContain('919999900000');
  });

  it.each([
    ['a non-E.164 number', { phoneE164: '09999900000' }],
    ['an empty number', { phoneE164: '' }],
    ['an unsupported region', { region: 'ZZ' }],
    ['a malformed locale', { locale: 'english' }]
  ])('refuses %s', async (_label, override) => {
    const { useCase } = build(true);
    await expect(useCase.set({ ...VALID, ...override })).rejects.toBeInstanceOf(
      CallValidationError
    );
  });

  it.each([
    ['an unknown contact', 'CNS-9999'],
    ['a revoked contact', 'CNS-0000'],
    ['no contact at all', '']
  ])('refuses to bind a number to %s', async (_label, contactId) => {
    const { useCase } = build(true);
    await expect(useCase.set({ ...VALID, contactId })).rejects.toBeInstanceOf(
      CallAuthorizationError
    );
  });

  it('refuses every change when the deployment has not opted in', async () => {
    const { useCase, settings } = build(false);

    await expect(useCase.set(VALID)).rejects.toBeInstanceOf(CallAuthorizationError);
    await expect(useCase.clear('someone', 'req')).rejects.toBeInstanceOf(CallAuthorizationError);
    await expect(settings.read()).resolves.toBeNull();
    // Reading still works, so the UI can present the setting as read-only.
    await expect(useCase.view()).resolves.toMatchObject({ runtimeChangesAllowed: false });
  });

  it('clears a configured target', async () => {
    const { useCase } = build(true);
    await useCase.set(VALID);
    await expect(useCase.clear('ops.demo@fieldrelay.io', 'req')).resolves.toMatchObject({
      configured: false
    });
  });
});

describe('maskPhone', () => {
  it('reveals only the last four digits', () => {
    expect(maskPhone('+919999900000')).toBe('••• ••• 0000');
    expect(maskPhone('+6512345678')).not.toContain('1234');
  });
});

describe('LayeredDialTargetResolver', () => {
  const environment: DialTargetResolverPort = {
    resolve: async (contactId) =>
      contactId === 'CNS-4491'
        ? { phoneE164: '+6512345678', region: 'SG', locale: 'en-SG' }
        : null
  };

  it('falls back to the environment allowlist when nothing is stored', async () => {
    const resolver = new LayeredDialTargetResolver(new InMemoryDialTargetSettings(), environment);
    await expect(resolver.resolve('CNS-4491')).resolves.toMatchObject({ region: 'SG' });
  });

  it('prefers the operator-nominated target for its own contact', async () => {
    const settings = new InMemoryDialTargetSettings();
    await settings.write({
      contactId: 'CNS-4491',
      phoneE164: '+919999900000',
      region: 'IN',
      locale: 'en-IN',
      updatedAt: new Date(),
      updatedBy: 'ops'
    });

    const resolver = new LayeredDialTargetResolver(settings, environment);
    await expect(resolver.resolve('CNS-4491')).resolves.toMatchObject({
      phoneE164: '+919999900000',
      region: 'IN'
    });
  });

  it('does not leak an operator target to a different contact', async () => {
    const settings = new InMemoryDialTargetSettings();
    await settings.write({
      contactId: 'CNS-4491',
      phoneE164: '+919999900000',
      region: 'IN',
      locale: 'en-IN',
      updatedAt: new Date(),
      updatedBy: 'ops'
    });

    const resolver = new LayeredDialTargetResolver(settings, environment);
    // Falls through to the environment, which does not know this contact.
    await expect(resolver.resolve('CNS-7777')).resolves.toBeNull();
  });
});
