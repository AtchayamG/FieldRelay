import { Injectable } from '@nestjs/common';
import { DialTarget, DialTargetResolverPort } from '../../application/dial-target.port';
import { CallProviderConfigurationError } from '../../application/errors';

// Dial targets are read from the environment, never from the repository and
// never from the database. Two consequences follow, both deliberate:
//
//   1. A number can only be called if an operator explicitly provisioned it in
//      the deployment environment, so an authorized-looking contact ID is not
//      by itself sufficient to reach a real person.
//   2. No phone number is ever committed to this repository or written to a
//      table, which is what security doc 08 section 4 requires.
//
// Format: CALLE_DIAL_TARGETS="CNS-4491=+6512345678|SG|en-SG,CNS-7788=+14155550123|US|en-US"
const E164 = /^\+[1-9]\d{6,14}$/;
const REGION = /^[A-Z]{2}$/;
const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;

@Injectable()
export class EnvDialTargetResolver implements DialTargetResolverPort {
  private readonly targets: ReadonlyMap<string, DialTarget>;

  constructor(raw: string | undefined = process.env.CALLE_DIAL_TARGETS) {
    this.targets = parseDialTargets(raw);
  }

  public get size(): number {
    return this.targets.size;
  }

  async resolve(contactId: string): Promise<DialTarget | null> {
    return this.targets.get(contactId) ?? null;
  }
}

export function parseDialTargets(raw: string | undefined): ReadonlyMap<string, DialTarget> {
  const targets = new Map<string, DialTarget>();
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return targets;
  }

  for (const entry of trimmed.split(',')) {
    const clean = entry.trim();
    if (!clean) {
      continue;
    }
    const separator = clean.indexOf('=');
    if (separator <= 0) {
      throw new CallProviderConfigurationError(
        'CALLE_DIAL_TARGETS entries must be formatted as contactId=+E164|REGION|locale'
      );
    }
    const contactId = clean.slice(0, separator).trim();
    const [phoneE164, region, locale] = clean
      .slice(separator + 1)
      .split('|')
      .map((part) => part.trim());

    // Every field is validated before it can reach a dialler. A malformed
    // entry fails the process at boot rather than dialling something unexpected.
    if (!contactId) {
      throw new CallProviderConfigurationError('CALLE_DIAL_TARGETS entry is missing a contact ID');
    }
    if (!phoneE164 || !E164.test(phoneE164)) {
      throw new CallProviderConfigurationError(
        `CALLE_DIAL_TARGETS entry for ${contactId} must supply an E.164 number`
      );
    }
    if (!region || !REGION.test(region)) {
      throw new CallProviderConfigurationError(
        `CALLE_DIAL_TARGETS entry for ${contactId} must supply a two-letter region code`
      );
    }
    if (!locale || !LOCALE.test(locale)) {
      throw new CallProviderConfigurationError(
        `CALLE_DIAL_TARGETS entry for ${contactId} must supply a locale such as en-US`
      );
    }
    if (targets.has(contactId)) {
      throw new CallProviderConfigurationError(
        `CALLE_DIAL_TARGETS contains a duplicate entry for ${contactId}`
      );
    }

    targets.set(contactId, { phoneE164, region, locale });
  }

  return targets;
}
