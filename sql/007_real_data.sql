-- ============================================================
-- 007_real_data.sql
-- Regionales colombianas reales, jerarquia Risaralda,
-- nombres y cedulas de asesores actualizados.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Renombrar la regional base a Risaralda
-- ============================================================
UPDATE regionals
SET code = 'REG-RIS', name = 'Risaralda'
WHERE id = '22222222-2222-2222-2222-222222222221';

-- ============================================================
-- 2. Agregar las 14 regionales restantes
-- ============================================================
INSERT INTO regionals (id, tenant_id, code, name) VALUES
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'REG-ANT', 'Antioquia'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'REG-VAL', 'Valle del Cauca'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'REG-CAL', 'Caldas'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'REG-ATL', 'Atlantico'),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111111', 'REG-BOY', 'Boyaca'),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111111', 'REG-PUT', 'Putumayo'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111111', 'REG-CAU', 'Cauca'),
  ('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111111', 'REG-HUI', 'Huila'),
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111111', 'REG-CHO', 'Choco'),
  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111111', 'REG-TOL', 'Tolima'),
  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111111', 'REG-QUI', 'Quindio'),
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111111', 'REG-CUN', 'Cundinamarca'),
  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111111', 'REG-SAN', 'Santander'),
  ('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111111', 'REG-MET', 'Meta')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Zonas para cada nueva regional (una zona por regional)
-- ============================================================
INSERT INTO zones (id, tenant_id, regional_id, code, name) VALUES
  ('33333333-3333-3333-3333-333333333402', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 'ZON-ANT', 'Zona Antioquia'),
  ('33333333-3333-3333-3333-333333333403', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'ZON-VAL', 'Zona Valle del Cauca'),
  ('33333333-3333-3333-3333-333333333404', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222204', 'ZON-CAL', 'Zona Caldas'),
  ('33333333-3333-3333-3333-333333333405', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222205', 'ZON-ATL', 'Zona Atlantico'),
  ('33333333-3333-3333-3333-333333333406', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222206', 'ZON-BOY', 'Zona Boyaca'),
  ('33333333-3333-3333-3333-333333333407', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222207', 'ZON-PUT', 'Zona Putumayo'),
  ('33333333-3333-3333-3333-333333333408', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222208', 'ZON-CAU', 'Zona Cauca'),
  ('33333333-3333-3333-3333-333333333409', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222209', 'ZON-HUI', 'Zona Huila'),
  ('33333333-3333-3333-3333-333333333410', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222210', 'ZON-CHO', 'Zona Choco'),
  ('33333333-3333-3333-3333-333333333411', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222211', 'ZON-TOL', 'Zona Tolima'),
  ('33333333-3333-3333-3333-333333333412', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222212', 'ZON-QUI', 'Zona Quindio'),
  ('33333333-3333-3333-3333-333333333413', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222213', 'ZON-CUN', 'Zona Cundinamarca'),
  ('33333333-3333-3333-3333-333333333414', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222214', 'ZON-SAN', 'Zona Santander'),
  ('33333333-3333-3333-3333-333333333415', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222215', 'ZON-MET', 'Zona Meta')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Jerarquia Risaralda:
--    Director: Fredy Alvarez
--    Coordinador: Jesus David Alvarez
--    Asesor: Jilma Rosa Gomez
-- ============================================================

-- Director Fredy Alvarez (Risaralda)
INSERT INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active)
SELECT
  'aaaaaaaa-1111-1111-1111-000000000001',
  '11111111-1111-1111-1111-111111111111',
  2,
  'fredy.alvarez@demo.com',
  '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6',
  'Fredy',
  'Alvarez',
  '10234567',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 'aaaaaaaa-1111-1111-1111-000000000001'
);

INSERT INTO director_profiles (user_id, regional_id)
SELECT 'aaaaaaaa-1111-1111-1111-000000000001', '22222222-2222-2222-2222-222222222221'
WHERE NOT EXISTS (
  SELECT 1 FROM director_profiles WHERE user_id = 'aaaaaaaa-1111-1111-1111-000000000001'
);

-- Coordinador Jesus David Alvarez (Zona A - Risaralda)
INSERT INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active)
SELECT
  'aaaaaaaa-2222-2222-2222-000000000002',
  '11111111-1111-1111-1111-111111111111',
  3,
  'jesusdavid.alvarez@demo.com',
  '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6',
  'Jesus David',
  'Alvarez',
  '1088321456',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 'aaaaaaaa-2222-2222-2222-000000000002'
);

INSERT INTO coordinator_profiles (user_id, zone_id)
SELECT 'aaaaaaaa-2222-2222-2222-000000000002', '33333333-3333-3333-3333-333333333331'
WHERE NOT EXISTS (
  SELECT 1 FROM coordinator_profiles WHERE user_id = 'aaaaaaaa-2222-2222-2222-000000000002'
);

-- Asesor Jilma Rosa Gomez (Zona A - Risaralda)
INSERT INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active)
SELECT
  'aaaaaaaa-3333-3333-3333-000000000003',
  '11111111-1111-1111-1111-111111111111',
  4,
  'jilma.gomez@demo.com',
  '$2a$10$8HzwhAU8EDdzCYeY475lYulRJQokuqVedSHdZ12GMp95c1Jn4yjy6',
  'Jilma Rosa',
  'Gomez',
  '24567890',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = 'aaaaaaaa-3333-3333-3333-000000000003'
);

INSERT INTO advisor_profiles (user_id, zone_id, category)
SELECT 'aaaaaaaa-3333-3333-3333-000000000003', '33333333-3333-3333-3333-333333333331', 'SENIOR'
WHERE NOT EXISTS (
  SELECT 1 FROM advisor_profiles WHERE user_id = 'aaaaaaaa-3333-3333-3333-000000000003'
);

-- ============================================================
-- 5. Actualizar nombres de asesores masivos (M001..M120)
--    Reemplazar last_name generico por nombres colombianos reales
--    y document_id por cedulas de 8-10 digitos.
-- ============================================================

-- Tabla temporal de nombres colombianos
DO $$
DECLARE
  nombres TEXT[] := ARRAY[
    'Carlos','Maria','Luis','Ana','Jorge','Laura','Andres','Sandra','Ricardo','Patricia',
    'Juan','Claudia','Oscar','Monica','Diego','Catalina','Felipe','Adriana','Sergio','Liliana',
    'Pablo','Gloria','Mauricio','Diana','Camilo','Marcela','Alejandro','Natalia','Hernan','Angela',
    'Gustavo','Viviana','Fernando','Carolina','Jhon','Paola','Rodrigo','Yaneth','Edwin','Martha',
    'Yolanda','Harvey','Olga','Nestor','Nancy','Jefferson','Luisa','Cristian','Esperanza','Fabian',
    'Zulma','Harold','Consuelo','Yesid','Gladys','Ferney','Rosa','Alexander','Nelly','Henry',
    'Esther','Jhonatan','Gloria','Javier','Amparo','William','Pilar','Orlando','Cecilia','Raul',
    'Sonia','Elkin','Lina','Elmer','Bertha','Holman','Stella','Wilmar','Marta','Alirio',
    'Beatriz','Yeison','Norma','Fredy','Alba','Danilo','Irene','Bibiana','Omar','Dora',
    'Arnulfo','Marleny','Humberto','Clara','Alvaro','Rocio','Cesar','Amparo','Gonzalo','Fanny',
    'Jorge','Lucy','Segundo','Diomedes','Elizabeth','Victor','Nohora','Efren','Leticia','Ramon',
    'Lucely','Anibal','Marisol','Leider','Rubiela','Blas','Miriam','Gilberto','Zoraida','Pedro'
  ];
  apellidos TEXT[] := ARRAY[
    'Garcia','Rodriguez','Martinez','Lopez','Gonzalez','Perez','Torres','Sanchez','Ramirez','Vargas',
    'Jimenez','Rojas','Diaz','Morales','Hernandez','Castro','Gutierrez','Ortiz','Rios','Mendoza',
    'Medina','Reyes','Aguilar','Molina','Ruiz','Romero','Silva','Ramos','Gomez','Cardona',
    'Zapata','Osorio','Correa','Castillo','Alvarez','Suarez','Pardo','Mora','Cruz','Bermudez',
    'Muñoz','Salcedo','Valencia','Arango','Montoya','Bedoya','Acosta','Palacio','Escobar','Arias',
    'Lozano','Cano','Tovar','Velez','Mejia','Carvajal','Herrera','Londoño','Osuna','Patiño',
    'Gil','Cifuentes','Rubio','Quintero','Velasquez','Galvis','Galindo','Leon','Montaño','Nieto',
    'Rincon','Sotelo','Camacho','Baron','Forero','Guevara','Franco','Naranjo','Urbano','Aguirre',
    'Castaño','Trujillo','Uribe','Salazar','Ocampo','Davila','Celis','Muñetones','Parra','Espinosa',
    'Sierra','Bolaños','Meneses','Castañeda','Cuellar','Zabala','Florez','Amaya','Barbosa','Pastrana',
    'Valbuena','Calderon','Cepeda','Rendon','Cordoba','Hurtado','Serrano','Solano','Marin','Carrillo',
    'Guerrero','Acevedo','Bravo','Estrada','Montes','Pulido','Vega','Pena','Raigosa','Restrepo'
  ];
  r RECORD;
  idx INT;
BEGIN
  idx := 1;
  FOR r IN
    SELECT id, email
    FROM users
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      AND email LIKE 'mass.asesor%@demo.com'
      AND deleted_at IS NULL
    ORDER BY email
  LOOP
    UPDATE users
    SET
      first_name   = nombres[((idx - 1) % array_length(nombres, 1)) + 1],
      last_name    = apellidos[((idx - 1) % array_length(apellidos, 1)) + 1],
      document_id  = (10000000 + (idx * 7919))::text  -- cedula 8 digitos unica por calculo primo
    WHERE id = r.id;
    idx := idx + 1;
  END LOOP;
END $$;

-- ============================================================
-- 6. Redistribuir ventas existentes entre las 15 regionales
--    para que los dashboards tengan datos variados.
-- ============================================================
WITH ranked AS (
  SELECT id,
    (ROW_NUMBER() OVER (ORDER BY id))::int % 15 AS bucket
  FROM sales
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
),
mapping AS (
  SELECT id,
    CASE bucket
      WHEN 0  THEN '22222222-2222-2222-2222-222222222221'::uuid
      WHEN 1  THEN '22222222-2222-2222-2222-222222222202'::uuid
      WHEN 2  THEN '22222222-2222-2222-2222-222222222203'::uuid
      WHEN 3  THEN '22222222-2222-2222-2222-222222222204'::uuid
      WHEN 4  THEN '22222222-2222-2222-2222-222222222205'::uuid
      WHEN 5  THEN '22222222-2222-2222-2222-222222222206'::uuid
      WHEN 6  THEN '22222222-2222-2222-2222-222222222207'::uuid
      WHEN 7  THEN '22222222-2222-2222-2222-222222222208'::uuid
      WHEN 8  THEN '22222222-2222-2222-2222-222222222209'::uuid
      WHEN 9  THEN '22222222-2222-2222-2222-222222222210'::uuid
      WHEN 10 THEN '22222222-2222-2222-2222-222222222211'::uuid
      WHEN 11 THEN '22222222-2222-2222-2222-222222222212'::uuid
      WHEN 12 THEN '22222222-2222-2222-2222-222222222213'::uuid
      WHEN 13 THEN '22222222-2222-2222-2222-222222222214'::uuid
      ELSE         '22222222-2222-2222-2222-222222222215'::uuid
    END AS new_regional_id
  FROM ranked
)
UPDATE sales s
SET regional_id = m.new_regional_id
FROM mapping m
WHERE s.id = m.id;

COMMIT;
