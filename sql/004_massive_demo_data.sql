-- Carga masiva demo para comparativas en dashboard.
-- Ejecuta sobre tenant DEMO.

BEGIN;

-- 1) Zonas adicionales para comparar desempeno entre zonas.
INSERT INTO zones (id, tenant_id, regional_id, code, name)
SELECT
  '33333333-3333-3333-3333-333333333332',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  'ZONA-B',
  'Zona B'
WHERE NOT EXISTS (
  SELECT 1 FROM zones WHERE id = '33333333-3333-3333-3333-333333333332'
);

INSERT INTO zones (id, tenant_id, regional_id, code, name)
SELECT
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  'ZONA-C',
  'Zona C'
WHERE NOT EXISTS (
  SELECT 1 FROM zones WHERE id = '33333333-3333-3333-3333-333333333333'
);

-- 2) Coordinadores para ZONA-B y ZONA-C.
INSERT INTO users (
  id, tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active
)
SELECT
  '77777777-7777-7777-7777-777777777775',
  '11111111-1111-1111-1111-111111111111',
  3,
  'coordinador.zonab@demo.com',
  'Admin123!',
  'Carla',
  'ZonaB',
  '2001',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND lower(email) = lower('coordinador.zonab@demo.com')
    AND deleted_at IS NULL
);

INSERT INTO users (
  id, tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active
)
SELECT
  '77777777-7777-7777-7777-777777777776',
  '11111111-1111-1111-1111-111111111111',
  3,
  'coordinador.zonac@demo.com',
  'Admin123!',
  'Camilo',
  'ZonaC',
  '2002',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND lower(email) = lower('coordinador.zonac@demo.com')
    AND deleted_at IS NULL
);

INSERT INTO coordinator_profiles (user_id, zone_id)
SELECT
  '77777777-7777-7777-7777-777777777775',
  '33333333-3333-3333-3333-333333333332'
WHERE NOT EXISTS (
  SELECT 1 FROM coordinator_profiles
  WHERE user_id = '77777777-7777-7777-7777-777777777775'
);

INSERT INTO coordinator_profiles (user_id, zone_id)
SELECT
  '77777777-7777-7777-7777-777777777776',
  '33333333-3333-3333-3333-333333333333'
WHERE NOT EXISTS (
  SELECT 1 FROM coordinator_profiles
  WHERE user_id = '77777777-7777-7777-7777-777777777776'
);

-- 3) Crear 120 asesores masivos.
WITH seq AS (
  SELECT gs AS n
  FROM generate_series(1, 120) gs
),
payload AS (
  SELECT
    n,
    'mass.asesor' || lpad(n::text, 3, '0') || '@demo.com' AS email,
    'Asesor' AS first_name,
    'M' || lpad(n::text, 3, '0') AS last_name,
    '9' || lpad(n::text, 5, '0') AS document_id
  FROM seq
)
INSERT INTO users (
  tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  4,
  p.email,
  'Admin123!',
  p.first_name,
  p.last_name,
  p.document_id,
  TRUE
FROM payload p
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  WHERE u.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND lower(u.email) = lower(p.email)
    AND u.deleted_at IS NULL
);

-- 4) Asignar perfiles de asesor distribuidos entre 3 zonas.
INSERT INTO advisor_profiles (user_id, zone_id, category)
SELECT
  u.id,
  CASE (substring(u.email from 'mass\.asesor([0-9]{3})@')::int % 3)
    WHEN 1 THEN '33333333-3333-3333-3333-333333333331'::uuid
    WHEN 2 THEN '33333333-3333-3333-3333-333333333332'::uuid
    ELSE '33333333-3333-3333-3333-333333333333'::uuid
  END AS zone_id,
  CASE
    WHEN (substring(u.email from 'mass\.asesor([0-9]{3})@')::int % 5) = 0 THEN 'SENIOR'
    ELSE 'GENERAL'
  END AS category
FROM users u
LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
WHERE u.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND u.email LIKE 'mass.asesor%@demo.com'
  AND u.deleted_at IS NULL
  AND ap.user_id IS NULL;

-- 5) Presupuestos por asesor (mes actual y anterior).
WITH advisor_ids AS (
  SELECT u.id AS advisor_id
  FROM users u
  WHERE u.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND u.email LIKE 'mass.asesor%@demo.com'
    AND u.deleted_at IS NULL
)
INSERT INTO budgets (
  id, tenant_id, month_date, scope_type, scope_id, target_amount, target_count, target_120_amount,
  approved_target_amount, created_by
)
SELECT
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  date_trunc('month', CURRENT_DATE)::date,
  'ADVISOR',
  a.advisor_id,
  target_amount,
  target_count,
  ROUND((target_amount * 1.2), 2),
  ROUND((target_amount * 0.8), 2),
  '77777777-7777-7777-7777-777777777771'
FROM (
  SELECT
    advisor_id,
    (1200000 + (random() * 1800000)::int)::numeric(16,2) AS target_amount,
    (12 + (random() * 20)::int) AS target_count
  FROM advisor_ids
) a
WHERE NOT EXISTS (
  SELECT 1
  FROM budgets b
  WHERE b.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND b.scope_type = 'ADVISOR'
    AND b.scope_id = a.advisor_id
    AND b.month_date = date_trunc('month', CURRENT_DATE)::date
    AND b.deleted_at IS NULL
);

WITH advisor_ids AS (
  SELECT u.id AS advisor_id
  FROM users u
  WHERE u.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND u.email LIKE 'mass.asesor%@demo.com'
    AND u.deleted_at IS NULL
)
INSERT INTO budgets (
  id, tenant_id, month_date, scope_type, scope_id, target_amount, target_count, target_120_amount,
  approved_target_amount, created_by
)
SELECT
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  (date_trunc('month', CURRENT_DATE) - interval '1 month')::date,
  'ADVISOR',
  a.advisor_id,
  target_amount,
  target_count,
  ROUND((target_amount * 1.2), 2),
  ROUND((target_amount * 0.78), 2),
  '77777777-7777-7777-7777-777777777771'
FROM (
  SELECT
    advisor_id,
    (1100000 + (random() * 1700000)::int)::numeric(16,2) AS target_amount,
    (10 + (random() * 18)::int) AS target_count
  FROM advisor_ids
) a
WHERE NOT EXISTS (
  SELECT 1
  FROM budgets b
  WHERE b.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND b.scope_type = 'ADVISOR'
    AND b.scope_id = a.advisor_id
    AND b.month_date = (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
    AND b.deleted_at IS NULL
);

-- 6) Regenerar ventas masivas demo para consistencia en comparativas.
DELETE FROM sales
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND note LIKE 'MASS_DEMO_%';

WITH advisor_base AS (
  SELECT
    u.id AS advisor_id,
    ap.zone_id,
    z.regional_id
  FROM users u
  JOIN advisor_profiles ap ON ap.user_id = u.id
  JOIN zones z ON z.id = ap.zone_id
  WHERE u.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND u.email LIKE 'mass.asesor%@demo.com'
    AND u.deleted_at IS NULL
),
current_rows AS (
  SELECT
    gen_random_uuid() AS id,
    '11111111-1111-1111-1111-111111111111'::uuid AS tenant_id,
    a.advisor_id,
    CASE
      WHEN a.zone_id = '33333333-3333-3333-3333-333333333331'::uuid THEN '77777777-7777-7777-7777-777777777773'::uuid
      WHEN a.zone_id = '33333333-3333-3333-3333-333333333332'::uuid THEN '77777777-7777-7777-7777-777777777775'::uuid
      ELSE '77777777-7777-7777-7777-777777777776'::uuid
    END AS coordinator_id,
    '77777777-7777-7777-7777-777777777772'::uuid AS director_id,
    a.regional_id,
    a.zone_id,
    CASE WHEN rnd.r_plan < 0.57
      THEN '44444444-4444-4444-4444-444444444441'::uuid
      ELSE '44444444-4444-4444-4444-444444444442'::uuid
    END AS plan_id,
    CASE
      WHEN rnd.r_status < 0.62 THEN '66666666-6666-6666-6666-666666666661'::uuid
      WHEN rnd.r_status < 0.9 THEN '66666666-6666-6666-6666-666666666662'::uuid
      ELSE '66666666-6666-6666-6666-666666666663'::uuid
    END AS status_id,
    (
      CASE WHEN rnd.r_plan < 0.57 THEN 120000 ELSE 240000 END
      + (rnd.r_delta * 45000)::int
    )::numeric(14,2) AS sale_amount,
    (
      date_trunc('month', CURRENT_DATE)::date + (rnd.r_day * 27)::int
    )::date AS sale_date,
    (
      date_trunc('month', CURRENT_DATE)::timestamp
      + ((rnd.r_day * 27)::int || ' days')::interval
      + ((6 + (rnd.r_hour * 13)::int) || ' hours')::interval
    )::timestamptz AS reported_at
  FROM advisor_base a
  CROSS JOIN generate_series(1, 24) gs
  CROSS JOIN LATERAL (
    SELECT random() AS r_status, random() AS r_plan, random() AS r_delta, random() AS r_day, random() AS r_hour
  ) rnd
),
previous_rows AS (
  SELECT
    gen_random_uuid() AS id,
    '11111111-1111-1111-1111-111111111111'::uuid AS tenant_id,
    a.advisor_id,
    CASE
      WHEN a.zone_id = '33333333-3333-3333-3333-333333333331'::uuid THEN '77777777-7777-7777-7777-777777777773'::uuid
      WHEN a.zone_id = '33333333-3333-3333-3333-333333333332'::uuid THEN '77777777-7777-7777-7777-777777777775'::uuid
      ELSE '77777777-7777-7777-7777-777777777776'::uuid
    END AS coordinator_id,
    '77777777-7777-7777-7777-777777777772'::uuid AS director_id,
    a.regional_id,
    a.zone_id,
    CASE WHEN rnd.r_plan < 0.57
      THEN '44444444-4444-4444-4444-444444444441'::uuid
      ELSE '44444444-4444-4444-4444-444444444442'::uuid
    END AS plan_id,
    CASE
      WHEN rnd.r_status < 0.58 THEN '66666666-6666-6666-6666-666666666661'::uuid
      WHEN rnd.r_status < 0.86 THEN '66666666-6666-6666-6666-666666666662'::uuid
      ELSE '66666666-6666-6666-6666-666666666663'::uuid
    END AS status_id,
    (
      CASE WHEN rnd.r_plan < 0.57 THEN 120000 ELSE 240000 END
      + (rnd.r_delta * 38000)::int
    )::numeric(14,2) AS sale_amount,
    (
      (date_trunc('month', CURRENT_DATE) - interval '1 month')::date + (rnd.r_day * 27)::int
    )::date AS sale_date,
    (
      (date_trunc('month', CURRENT_DATE) - interval '1 month')::timestamp
      + ((rnd.r_day * 27)::int || ' days')::interval
      + ((6 + (rnd.r_hour * 13)::int) || ' hours')::interval
    )::timestamptz AS reported_at
  FROM advisor_base a
  CROSS JOIN generate_series(1, 20) gs
  CROSS JOIN LATERAL (
    SELECT random() AS r_status, random() AS r_plan, random() AS r_delta, random() AS r_day, random() AS r_hour
  ) rnd
)
INSERT INTO sales (
  id, tenant_id, advisor_id, coordinator_id, director_id, regional_id, zone_id, plan_id, status_id,
  sale_amount, approved_amount, is_fallen, sale_date, reported_at, note, created_by, updated_by
)
SELECT
  c.id,
  c.tenant_id,
  c.advisor_id,
  c.coordinator_id,
  c.director_id,
  c.regional_id,
  c.zone_id,
  c.plan_id,
  c.status_id,
  c.sale_amount,
  CASE
    WHEN c.status_id = '66666666-6666-6666-6666-666666666662'::uuid THEN c.sale_amount
    ELSE 0::numeric(14,2)
  END AS approved_amount,
  (c.status_id = '66666666-6666-6666-6666-666666666663'::uuid) AS is_fallen,
  c.sale_date,
  c.reported_at,
  'MASS_DEMO_CURRENT' AS note,
  c.advisor_id AS created_by,
  c.advisor_id AS updated_by
FROM current_rows c
UNION ALL
SELECT
  p.id,
  p.tenant_id,
  p.advisor_id,
  p.coordinator_id,
  p.director_id,
  p.regional_id,
  p.zone_id,
  p.plan_id,
  p.status_id,
  p.sale_amount,
  CASE
    WHEN p.status_id = '66666666-6666-6666-6666-666666666662'::uuid THEN p.sale_amount
    ELSE 0::numeric(14,2)
  END AS approved_amount,
  (p.status_id = '66666666-6666-6666-6666-666666666663'::uuid) AS is_fallen,
  p.sale_date,
  p.reported_at,
  'MASS_DEMO_PREVIOUS' AS note,
  p.advisor_id AS created_by,
  p.advisor_id AS updated_by
FROM previous_rows p;

COMMIT;
