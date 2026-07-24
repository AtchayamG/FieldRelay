-- Deterministic demo data. Every value here is fictional: the properties, the
-- reporters and the 2042 identifiers do not correspond to any real person,
-- address or account. Safe to load into a judge-facing environment.
--
-- Fixed UUIDs keep the seed idempotent and make demo scripts reproducible.

INSERT INTO incidents (
  id, display_id, property_id, unit, type, priority, status,
  description, reported_by, created_at, updated_at, version
) VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'INC-2042-0001',
    'PROP-001', '4B', 'plumbing', 'critical', 'triage',
    'Mixer valve failure in the main bathroom; water shut off at the riser.',
    'Demo Property Manager',
    TIMESTAMPTZ '2042-03-01 09:12:00+00', TIMESTAMPTZ '2042-03-01 09:40:00+00', 2
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'INC-2042-0002',
    'PROP-001', '2A', 'hvac', 'high', 'intake',
    'Air handler is cycling every few minutes and not holding the set point.',
    'Demo Property Manager',
    TIMESTAMPTZ '2042-03-01 11:05:00+00', TIMESTAMPTZ '2042-03-01 11:05:00+00', 1
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'INC-2042-0003',
    'PROP-002', NULL, 'electrical', 'medium', 'dispatched',
    'Lobby emergency lighting circuit trips whenever the load test is run.',
    'Demo Field Supervisor',
    TIMESTAMPTZ '2042-02-28 16:30:00+00', TIMESTAMPTZ '2042-03-01 08:15:00+00', 3
  )
ON CONFLICT (id) DO NOTHING;

-- Keep generated display identifiers clear of the seeded block.
SELECT setval('incident_display_seq', 3, true);

-- audit_events is append-only and has no natural key to upsert on, so the seed
-- guards on its own actor instead: re-running it adds nothing.
INSERT INTO audit_events (
  actor_type, actor_id, action, entity_type, entity_id, correlation_id, metadata, created_at
)
SELECT * FROM (VALUES
  (
    'system', 'fieldrelay-seed', 'incident.created', 'incident',
    '11111111-1111-4111-8111-111111111101', 'seed_demo_0001',
    '{"displayId":"INC-2042-0001","seeded":true}'::jsonb,
    TIMESTAMPTZ '2042-03-01 09:12:00+00'
  ),
  (
    'system', 'fieldrelay-seed', 'incident.created', 'incident',
    '11111111-1111-4111-8111-111111111102', 'seed_demo_0002',
    '{"displayId":"INC-2042-0002","seeded":true}'::jsonb,
    TIMESTAMPTZ '2042-03-01 11:05:00+00'
  ),
  (
    'system', 'fieldrelay-seed', 'incident.created', 'incident',
    '11111111-1111-4111-8111-111111111103', 'seed_demo_0003',
    '{"displayId":"INC-2042-0003","seeded":true}'::jsonb,
    TIMESTAMPTZ '2042-02-28 16:30:00+00'
  )
) AS seeded (actor_type, actor_id, action, entity_type, entity_id, correlation_id, metadata, created_at)
WHERE NOT EXISTS (SELECT 1 FROM audit_events WHERE actor_id = 'fieldrelay-seed');
