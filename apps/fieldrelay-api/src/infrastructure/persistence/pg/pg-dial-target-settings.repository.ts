import { Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DialTargetSettingsPort,
  StoredDialTarget
} from '../../../application/dial-target-settings.port';
import { PgPoolProvider } from './pg-unit-of-work';

const KEY = 'live_dial_target';

interface StoredValue {
  contactId: string;
  phoneE164: string;
  region: string;
  locale: string;
}

// Deliberately outside the transactional unit of work: changing the live call
// target is a standalone operator action, not part of an incident or call write
// path, and must not be able to join or roll back one.
@Injectable()
export class PgDialTargetSettingsRepository implements DialTargetSettingsPort {
  private readonly pool: Pool;

  constructor(pools: PgPoolProvider) {
    this.pool = pools.pool;
  }

  public async read(): Promise<StoredDialTarget | null> {
    const result = await this.pool.query<{
      value: StoredValue;
      updated_at: Date;
      updated_by: string;
    }>('SELECT value, updated_at, updated_by FROM runtime_settings WHERE key = $1', [KEY]);

    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      contactId: row.value.contactId,
      phoneE164: row.value.phoneE164,
      region: row.value.region,
      locale: row.value.locale,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  public async write(target: StoredDialTarget): Promise<void> {
    const value: StoredValue = {
      contactId: target.contactId,
      phoneE164: target.phoneE164,
      region: target.region,
      locale: target.locale
    };
    await this.pool.query(
      `INSERT INTO runtime_settings (key, value, updated_at, updated_by)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = EXCLUDED.updated_at,
             updated_by = EXCLUDED.updated_by`,
      [KEY, JSON.stringify(value), target.updatedAt, target.updatedBy]
    );
  }

  public async clear(): Promise<void> {
    await this.pool.query('DELETE FROM runtime_settings WHERE key = $1', [KEY]);
  }
}

// Test double, and the store used when no database is wired.
export class InMemoryDialTargetSettings implements DialTargetSettingsPort {
  private current: StoredDialTarget | null = null;

  async read(): Promise<StoredDialTarget | null> {
    return this.current;
  }

  async write(target: StoredDialTarget): Promise<void> {
    this.current = { ...target };
  }

  async clear(): Promise<void> {
    this.current = null;
  }
}
