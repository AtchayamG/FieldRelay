import { CallAuthorizationError, CallValidationError } from './errors';
import { ContactAuthorizationPort } from './contact-authorization.port';
import { DialTargetSettingsPort, StoredDialTarget } from './dial-target-settings.port';
import { TransactionPort } from './persistence.port';

// CALL-E's documented recipient regions. A number outside these cannot be
// dialled, so it is refused at entry rather than failing later against the
// provider with a less obvious message.
export const SUPPORTED_REGIONS = [
  'US', 'SG', 'MY', 'IN', 'AE', 'AU', 'CA', 'GB',
  'VN', 'DE', 'JP', 'FR', 'MX', 'BR', 'ID', 'PH', 'KE'
] as const;

const E164 = /^\+[1-9]\d{6,14}$/;
const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;

export interface SetDialTargetInput {
  contactId: string;
  phoneE164: string;
  region: string;
  locale: string;
  actor: string;
  correlationId: string;
}

// What the API is willing to say back about a stored number. The full number is
// never returned: an operator confirms it by its last four digits, which is
// enough to recognise a number you nominated and not enough to harvest one.
export interface DialTargetView {
  configured: boolean;
  contactId: string | null;
  maskedPhone: string | null;
  region: string | null;
  locale: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  // False when the deployment forbids runtime changes entirely, in which case
  // the UI must present this as read-only rather than offering a doomed save.
  runtimeChangesAllowed: boolean;
}

export function maskPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `••• ••• ${digits.slice(-4)}`;
}

export class ManageDialTargetUseCase {
  constructor(
    private readonly settings: DialTargetSettingsPort,
    private readonly contacts: ContactAuthorizationPort,
    private readonly transactions: TransactionPort,
    // Default false. A deployment must opt in before any number can be changed
    // from inside the application, so the judge environment cannot be pointed
    // at an arbitrary phone by anyone who signs in with the published demo
    // credentials.
    private readonly runtimeChangesAllowed: boolean = false
  ) {}

  public async view(): Promise<DialTargetView> {
    const stored = await this.settings.read();
    if (!stored) {
      return {
        configured: false,
        contactId: null,
        maskedPhone: null,
        region: null,
        locale: null,
        updatedAt: null,
        updatedBy: null,
        runtimeChangesAllowed: this.runtimeChangesAllowed
      };
    }
    return {
      configured: true,
      contactId: stored.contactId,
      maskedPhone: maskPhone(stored.phoneE164),
      region: stored.region,
      locale: stored.locale,
      updatedAt: stored.updatedAt.toISOString(),
      updatedBy: stored.updatedBy,
      runtimeChangesAllowed: this.runtimeChangesAllowed
    };
  }

  public async set(input: SetDialTargetInput): Promise<DialTargetView> {
    this.requireRuntimeChangesAllowed();

    const phoneE164 = (input.phoneE164 ?? '').trim().replace(/[\s()-]/g, '');
    const region = (input.region ?? '').trim().toUpperCase();
    const locale = (input.locale ?? '').trim();
    const contactId = (input.contactId ?? '').trim();

    if (!E164.test(phoneE164)) {
      throw new CallValidationError(
        'phoneE164 must be an E.164 number, for example +6512345678'
      );
    }
    if (!(SUPPORTED_REGIONS as readonly string[]).includes(region)) {
      throw new CallValidationError(
        `region must be one of: ${SUPPORTED_REGIONS.join(', ')}`
      );
    }
    if (!LOCALE.test(locale)) {
      throw new CallValidationError('locale must look like en-US');
    }

    // The number is only meaningful attached to a contact that is authorized to
    // be called. Binding it here means the existing purpose checks in
    // StartCallUseCase continue to apply to whatever number is nominated.
    const contact = await this.contacts.resolve(contactId);
    if (!contact || contact.authorizationStatus !== 'authorized') {
      throw new CallAuthorizationError(
        `Contact ${contactId || '(none)'} is not an authorized contact`
      );
    }

    const target: StoredDialTarget = {
      contactId,
      phoneE164,
      region,
      locale,
      updatedAt: new Date(),
      updatedBy: input.actor
    };
    await this.settings.write(target);

    // Changing which telephone this system can reach is a security-relevant
    // act, so it is auditable. The number itself is never written to the audit
    // trail — only its masked form.
    await this.transactions.withTransaction((uow) =>
      uow.audit.append({
        actorType: 'user',
        actorId: input.actor,
        action: 'settings.dial_target.updated',
        entityType: 'runtime_setting',
        entityId: 'live_dial_target',
        correlationId: input.correlationId,
        metadata: {
          contactId,
          region,
          locale,
          maskedPhone: maskPhone(phoneE164)
        }
      })
    );

    return this.view();
  }

  public async clear(actor: string, correlationId: string): Promise<DialTargetView> {
    this.requireRuntimeChangesAllowed();
    await this.settings.clear();
    await this.transactions.withTransaction((uow) =>
      uow.audit.append({
        actorType: 'user',
        actorId: actor,
        action: 'settings.dial_target.cleared',
        entityType: 'runtime_setting',
        entityId: 'live_dial_target',
        correlationId,
        metadata: {}
      })
    );
    return this.view();
  }

  private requireRuntimeChangesAllowed(): void {
    if (!this.runtimeChangesAllowed) {
      throw new CallAuthorizationError(
        'This deployment does not permit changing the live call target at runtime. ' +
          'Set CALLE_ALLOW_RUNTIME_DIAL_TARGET=true to enable it.'
      );
    }
  }
}
