-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DE EJEMPLO — sin credenciales en texto plano.
-- Copia este archivo a sql/003_seed.sql y ajusta los valores antes de usarlo.
-- El hash corresponde a la contraseña de demo; cámbialo en producción.
--
--   Generar hash bcrypt en Node.js:
--   node -e "const b=require('./backend/node_modules/bcryptjs');
--            b.hash('TuPassword',10).then(h=>console.log(h))"
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO tenants (id, code, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'DEMO', 'Tenant Demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, role_key, role_name) VALUES
  (1, 'ADMINISTRADOR', 'Administrador'),
  (2, 'DIRECTOR', 'Director'),
  (3, 'COORDINADOR', 'Coordinador'),
  (4, 'ASESOR', 'Asesor')
ON CONFLICT (id) DO UPDATE SET role_key = EXCLUDED.role_key, role_name = EXCLUDED.role_name;

INSERT INTO regionals (id, tenant_id, code, name) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'REG-CENTRO', 'Regional Centro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO zones (id, tenant_id, regional_id, code, name) VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'ZONA-A', 'Zona A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, tenant_id, code, name, base_price) VALUES
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'PLAN-BASIC', 'Plan Basico', 120000),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'PLAN-PRO', 'Plan Pro', 240000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, tenant_id, code, name, price) VALUES
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'SVC-ASSIST', 'Asistencia Premium', 35000),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'SVC-DIGITAL', 'Pack Digital', 18000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO status_catalog (id, tenant_id, code, name, is_final, is_approved) VALUES
  ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'CANTADO', 'Cantado', FALSE, FALSE),
  ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'APROBADO', 'Aprobado', TRUE, TRUE),
  ('66666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', 'CAIDO', 'Caido', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Contraseñas almacenadas como bcrypt hash (NO texto plano).
-- Reemplaza el hash por uno generado con tu propia contraseña de demo.
INSERT INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active) VALUES
  ('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', 1, 'admin@demo.com',       '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6', 'Admin',   'Demo',        '1001', TRUE),
  ('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', 2, 'director@demo.com',    '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6', 'Diana',   'Director',    '1002', TRUE),
  ('77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', 3, 'coordinador@demo.com', '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6', 'Carlos',  'Coordinador', '1003', TRUE),
  ('77777777-7777-7777-7777-777777777774', '11111111-1111-1111-1111-111111111111', 4, 'asesor@demo.com',      '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6', 'Ana',     'Asesor',      '1004', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO director_profiles (user_id, regional_id) VALUES
  ('77777777-7777-7777-7777-777777777772', '22222222-2222-2222-2222-222222222221')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO coordinator_profiles (user_id, zone_id) VALUES
  ('77777777-7777-7777-7777-777777777773', '33333333-3333-3333-3333-333333333331')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO advisor_profiles (user_id, zone_id, category) VALUES
  ('77777777-7777-7777-7777-777777777774', '33333333-3333-3333-3333-333333333331', 'SENIOR')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO budgets (id, tenant_id, month_date, scope_type, scope_id, target_amount, target_count, target_120_amount, approved_target_amount, created_by) VALUES
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', date_trunc('month', CURRENT_DATE)::date,                             'REGIONAL', '22222222-2222-2222-2222-222222222221', 12000000, 80, 14400000,  9000000, '77777777-7777-7777-7777-777777777771'),
  ('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', (date_trunc('month', CURRENT_DATE) - interval '1 month')::date,      'REGIONAL', '22222222-2222-2222-2222-222222222221', 10000000, 70, 12000000,  8500000, '77777777-7777-7777-7777-777777777771'),
  ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', date_trunc('month', CURRENT_DATE)::date,                             'ADVISOR',  '77777777-7777-7777-7777-777777777774',  1800000, 12,  2160000,  1400000, '77777777-7777-7777-7777-777777777771'),
  ('88888888-8888-8888-8888-888888888884', '11111111-1111-1111-1111-111111111111', (date_trunc('month', CURRENT_DATE) - interval '1 month')::date,      'ADVISOR',  '77777777-7777-7777-7777-777777777774',  1600000, 10,  1920000,  1300000, '77777777-7777-7777-7777-777777777771')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales (
  id, tenant_id, advisor_id, coordinator_id, director_id, regional_id, zone_id,
  plan_id, status_id, sale_amount, approved_amount, is_fallen, sale_date, reported_at, note, created_by
) VALUES
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777774',
    '77777777-7777-7777-7777-777777777773',
    '77777777-7777-7777-7777-777777777772',
    '22222222-2222-2222-2222-222222222221',
    '33333333-3333-3333-3333-333333333331',
    '44444444-4444-4444-4444-444444444441',
    '66666666-6666-6666-6666-666666666661',
    120000, 0, FALSE,
    (date_trunc('month', CURRENT_DATE) + interval '2 day')::date,
    NOW(), 'Venta cantada mes actual',
    '77777777-7777-7777-7777-777777777774'
  ),
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777774',
    '77777777-7777-7777-7777-777777777773',
    '77777777-7777-7777-7777-777777777772',
    '22222222-2222-2222-2222-222222222221',
    '33333333-3333-3333-3333-333333333331',
    '44444444-4444-4444-4444-444444444442',
    '66666666-6666-6666-6666-666666666662',
    240000, 240000, FALSE,
    (date_trunc('month', CURRENT_DATE) + interval '5 day')::date,
    NOW(), 'Venta aprobada mes actual',
    '77777777-7777-7777-7777-777777777774'
  ),
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777774',
    '77777777-7777-7777-7777-777777777773',
    '77777777-7777-7777-7777-777777777772',
    '22222222-2222-2222-2222-222222222221',
    '33333333-3333-3333-3333-333333333331',
    '44444444-4444-4444-4444-444444444441',
    '66666666-6666-6666-6666-666666666663',
    120000, 0, TRUE,
    (date_trunc('month', CURRENT_DATE) - interval '20 day')::date,
    NOW() - interval '20 day', 'Venta caida mes anterior',
    '77777777-7777-7777-7777-777777777774'
  );
