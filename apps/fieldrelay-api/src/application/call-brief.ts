import { CallPurpose } from '../domain/call-task.entity';
import { CallBrief } from './call-e.port';

// Every outbound call opens with an explicit disclosure. Recording it here,
// next to the goal, makes it impossible to brief a call without one
// (security doc 08, section 5).
const DISCLOSURE =
  'This is an automated assistant calling on behalf of a property management ' +
  'team about a maintenance request. This call may be recorded. You can ask to ' +
  'speak with a person at any time.';

// Result schemas are deliberately small, closed (`additionalProperties: false`)
// and free-text-averse. A narrow schema is what makes a phone answer safe to
// act on downstream: anything the caller could not have been asked cannot come
// back, and every uncertain answer has an explicit `unknown` branch rather than
// being coerced into a decision.
const YES_NO_UNKNOWN = { type: 'string', enum: ['yes', 'no', 'unknown'] } as const;

const BRIEFS: Record<CallPurpose, CallBrief> = {
  vendor_availability: {
    goal:
      'Ask whether the vendor can take on a maintenance job for the referenced ' +
      'incident, when their earliest technician could arrive, and roughly what ' +
      'it would cost. Do not agree to any work, price, or appointment on the ' +
      "caller's behalf; only collect the answers.",
    disclosure: DISCLOSURE,
    resultSchema: {
      type: 'object',
      required: ['available'],
      properties: {
        available: YES_NO_UNKNOWN,
        earliest_eta_minutes: { type: ['integer', 'null'], minimum: 0, maximum: 20160 },
        quoted_amount_text: { type: ['string', 'null'], maxLength: 120 },
        answered_by_name: { type: ['string', 'null'], maxLength: 120 }
      },
      additionalProperties: false
    }
  },
  appointment_confirmation: {
    goal:
      'Confirm whether the already-scheduled maintenance appointment for the ' +
      'referenced incident still stands, and note the time window the other ' +
      'party states. Do not reschedule and do not offer alternative times.',
    disclosure: DISCLOSURE,
    resultSchema: {
      type: 'object',
      required: ['confirmed'],
      properties: {
        confirmed: YES_NO_UNKNOWN,
        stated_time_window: { type: ['string', 'null'], maxLength: 120 },
        answered_by_name: { type: ['string', 'null'], maxLength: 120 }
      },
      additionalProperties: false
    }
  },
  status_update: {
    goal:
      'Ask for the current status of the referenced maintenance job and whether ' +
      'anything is blocking completion. Do not make commitments, approve costs, ' +
      'or escalate on the call.',
    disclosure: DISCLOSURE,
    resultSchema: {
      type: 'object',
      required: ['follow_up_required'],
      properties: {
        follow_up_required: YES_NO_UNKNOWN,
        status_summary: { type: ['string', 'null'], maxLength: 400 },
        answered_by_name: { type: ['string', 'null'], maxLength: 120 }
      },
      additionalProperties: false
    }
  }
};

// The reference is the human-readable call display ID, never the incident's
// internal UUID and never any tenant, address or contact detail. The person who
// answers hears an opaque ticket reference and nothing more.
export function briefForPurpose(purpose: CallPurpose, reference: string): CallBrief {
  const template = BRIEFS[purpose];
  if (!template) {
    throw new Error(`No call brief is defined for purpose "${purpose}"`);
  }
  return {
    ...template,
    goal: `${template.goal} Refer to the job only as reference ${reference}.`,
    resultSchema: { ...template.resultSchema }
  };
}
