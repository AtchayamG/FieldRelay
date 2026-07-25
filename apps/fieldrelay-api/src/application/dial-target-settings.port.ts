import { DialTarget } from './dial-target.port';

export const DIAL_TARGET_SETTINGS_PORT = Symbol('DIAL_TARGET_SETTINGS_PORT');

export interface StoredDialTarget extends DialTarget {
  // Which authorized contact this number answers for. A number is never
  // dialable on its own; it is always bound to a contact the caller is
  // authorized to reach for a specific purpose.
  contactId: string;
  updatedAt: Date;
  updatedBy: string;
}

// Kept outside the transactional unit of work on purpose. Changing the live
// call target is an operator action in its own right, not part of an incident
// or call write path, so it must not be able to join — or roll back — one.
export interface DialTargetSettingsPort {
  read(): Promise<StoredDialTarget | null>;
  write(target: StoredDialTarget): Promise<void>;
  clear(): Promise<void>;
}
