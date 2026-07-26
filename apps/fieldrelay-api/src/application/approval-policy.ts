import { CallOutcome } from './call-outcome';
import { ApprovalReason } from '../domain/approval.entity';

// Below this, the provider is not confident enough for the answer to be acted
// on without a person reading it. 0.7 is deliberately cautious: the cost of an
// unnecessary approval is thirty seconds of someone's attention, and the cost of
// a wrong automatic dispatch is a technician sent to the wrong job.
export const CONFIDENCE_REVIEW_THRESHOLD = 0.7;

// Fields that represent a commitment of money. An answer carrying one always
// goes to a person: CALL-E can discover that a vendor will attend for $360, but
// only a human can agree to pay it.
const COST_FIELDS = ['quoted_amount_text'];

// Decides whether a validated outcome may be acted on automatically, and if
// not, why. Returning the reasons rather than a bare boolean is what lets the
// queue explain itself to the person being asked.
//
// Kept as a pure function so the rule is testable in isolation and visible in
// one place, rather than scattered through the write path.
export function evaluateApprovalRequirement(outcome: CallOutcome): ApprovalReason[] {
  const reasons: ApprovalReason[] = [];

  if (COST_FIELDS.some((field) => field in outcome.structuredResult)) {
    reasons.push('cost_commitment');
  }

  // A partial answer means fields were discarded. Whatever survived may still
  // be useful, but a person has to decide that.
  if (outcome.validationFailed) {
    reasons.push('incomplete_answer');
  }

  // The call finished but the goal was not achieved. Escalation, retry or
  // abandonment are all human calls.
  if (!outcome.taskCompleted) {
    reasons.push('task_not_completed');
  }

  // A null score means the provider offered no confidence at all, which is not
  // the same as being confident. Treated as low.
  if (outcome.confidenceScore === null || outcome.confidenceScore < CONFIDENCE_REVIEW_THRESHOLD) {
    reasons.push('low_confidence');
  }

  return reasons;
}

export function requiresApproval(outcome: CallOutcome): boolean {
  return evaluateApprovalRequirement(outcome).length > 0;
}

// Human-readable, for the queue and the audit trail. Kept beside the policy so
// a new reason cannot be added without also being explainable.
export const APPROVAL_REASON_TEXT: Record<ApprovalReason, string> = {
  cost_commitment: 'The vendor quoted a price. Approving commits the organisation to that cost.',
  low_confidence:
    'CALL-E was not confident it understood the answer. Read it before acting on it.',
  incomplete_answer:
    'Part of the answer did not match the expected schema and was discarded. The record is incomplete.',
  task_not_completed: 'The call finished without achieving what it was placed for.'
};
