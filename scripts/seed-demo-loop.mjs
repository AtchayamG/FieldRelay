// Seed the deployed demo environment with one complete loop, so the Dispatch
// Board, Approvals queue and Analytics have something real to show.
//
//   node scripts/seed-demo-loop.mjs
//
// HONESTY NOTE, because this matters more than the convenience:
//
// Everything inserted here is marked `simulated = true` and renders in the UI
// with a SIMULATED badge. This is the same data the demo CALL-E adapter
// produces — it reaches no telephone and costs nothing. It exists so an
// evaluator can see the approval gate and the dispatch board populated without
// anyone spending a metered call.
//
// The structured result below is copied verbatim from the REAL call FieldRelay
// placed (`call_MzD1ou1AbX1XtYkTnxMCBA`, recorded in docs/CALL_E_RUNTIME_PROOF.md)
// so the demo shows a shape CALL-E actually returned rather than one invented
// to look good. The call record itself is still labelled simulated, because
// this row is not that call.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(ROOT, 'apps', 'fieldrelay-api', 'package.json'));
const pg = require('pg');

const env = readFileSync(join(ROOT, '.vercel', '.env.production'), 'utf8');
const line = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const connectionString = line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query('BEGIN');

  // Reuse the seeded plumbing incident so the demo reads as one story rather
  // than a disconnected record.
  const incident = await client.query(
    `SELECT id, display_id FROM incidents WHERE type = 'plumbing' ORDER BY created_at ASC LIMIT 1`
  );
  if (incident.rowCount === 0) {
    throw new Error('No plumbing incident to attach the loop to.');
  }
  const incidentId = incident.rows[0].id;

  const callId = randomUUID();
  const callDisplay = `CALL-2042-${String(
    Number((await client.query("SELECT nextval('call_task_display_seq') AS n")).rows[0].n)
  ).padStart(4, '0')}`;

  await client.query(
    `INSERT INTO call_tasks
       (id, display_id, incident_id, provider, provider_task_id, purpose,
        authorized_contact_id, status, simulated, failure_code, timeout_seconds,
        retries, created_at, updated_at, version)
     VALUES ($1, $2, $3, 'demo', $4, 'vendor_availability', 'CNS-4491',
             'completed', TRUE, NULL, 300, 0, NOW() - INTERVAL '9 minutes', NOW() - INTERVAL '6 minutes', 2)`,
    [callId, callDisplay, incidentId, `demo_${randomUUID().slice(0, 12)}`]
  );

  // The shape CALL-E really returned. See the note at the top of this file.
  const structuredResult = { available: 'yes', quoted_amount_text: '$35' };

  await client.query(
    `INSERT INTO call_outcomes
       (call_task_id, structured_result, task_completed, confidence_score,
        confidence_label, validation_failed, received_at)
     VALUES ($1, $2::jsonb, TRUE, 0.82, 'high', FALSE, NOW() - INTERVAL '6 minutes')
     ON CONFLICT (call_task_id) DO UPDATE
       SET structured_result = EXCLUDED.structured_result,
           received_at = EXCLUDED.received_at`,
    [callId, JSON.stringify(structuredResult)]
  );

  const outcomeReceivedAt = (
    await client.query('SELECT received_at FROM call_outcomes WHERE call_task_id = $1', [callId])
  ).rows[0].received_at;

  // The approval the policy raises for a quoted price. Left PENDING on purpose:
  // the demo's whole point is the moment the system stops and asks.
  const approvalId = randomUUID();
  const approvalDisplay = `APP-2042-${String(
    Number((await client.query("SELECT nextval('approval_display_seq') AS n")).rows[0].n)
  ).padStart(4, '0')}`;

  await client.query(
    `INSERT INTO approvals
       (id, display_id, incident_id, call_task_id, status, reasons,
        outcome_received_at, decided_by, decided_at, decision_note, created_at, version)
     VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6, NULL, NULL, NULL,
             NOW() - INTERVAL '6 minutes', 1)`,
    [approvalId, approvalDisplay, incidentId, callId, JSON.stringify(['cost_commitment']), outcomeReceivedAt]
  );

  await client.query('COMMIT');

  console.log(`  incident  ${incident.rows[0].display_id}`);
  console.log(`  call      ${callDisplay}   simulated, completed`);
  console.log(`  outcome   available=yes, quoted_amount_text=$35, confidence 0.82`);
  console.log(`  approval  ${approvalDisplay}   PENDING - a price was quoted`);
  console.log('\n  The loop is now visible. Approve and release it from the UI.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error(`  FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
