import { randomUUID } from 'node:crypto';
import type { CallPurpose } from '@fieldrelay/contracts';

export const createMockIdempotencyKey = (): string => `idemp_${randomUUID()}`;

export const MOCK_INCIDENT_ID = 'INC-2042-0891';
export const MOCK_CONTACT_ID = 'CNS-4491';
export const MOCK_PURPOSE: CallPurpose = 'vendor_availability';

export const getMockContact = (): {
  id: string;
  propertyId: string;
  type: string;
  name: string;
  phoneToken: string;
  authorizationStatus: 'authorized';
  allowedPurposes: readonly CallPurpose[];
} => ({
  id: MOCK_CONTACT_ID,
  propertyId: 'PROP-001',
  type: 'tenant',
  name: 'Jane Doe',
  phoneToken: 'tok_5550199',
  authorizationStatus: 'authorized',
  allowedPurposes: ['vendor_availability', 'appointment_confirmation']
});
