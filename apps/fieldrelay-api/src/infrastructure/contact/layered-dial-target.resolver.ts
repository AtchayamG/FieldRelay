import { Injectable } from '@nestjs/common';
import { DialTargetSettingsPort } from '../../application/dial-target-settings.port';
import { DialTarget, DialTargetResolverPort } from '../../application/dial-target.port';

// Resolution order, most specific first:
//
//   1. The operator-nominated target stored through Settings, if one is set and
//      it is bound to the contact being called.
//   2. The environment allowlist, CALLE_DIAL_TARGETS.
//
// A contact with no entry in either resolves to null, and StartCallUseCase then
// refuses the call. There is no fallback that guesses a number, so the failure
// mode of a misconfiguration is a refused call, never a call to the wrong
// person.
@Injectable()
export class LayeredDialTargetResolver implements DialTargetResolverPort {
  constructor(
    private readonly settings: DialTargetSettingsPort,
    private readonly environment: DialTargetResolverPort
  ) {}

  public async resolve(contactId: string): Promise<DialTarget | null> {
    const stored = await this.settings.read();
    if (stored && stored.contactId === contactId) {
      return {
        phoneE164: stored.phoneE164,
        region: stored.region,
        locale: stored.locale
      };
    }
    return this.environment.resolve(contactId);
  }
}
