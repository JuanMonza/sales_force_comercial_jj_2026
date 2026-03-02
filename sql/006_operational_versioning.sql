CREATE TABLE IF NOT EXISTS record_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_name VARCHAR(80) NOT NULL,
  record_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  old_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, entity_name, record_id, version_no)
);

CREATE INDEX IF NOT EXISTS ix_record_versions_lookup
  ON record_versions(tenant_id, entity_name, record_id, version_no DESC);

INSERT INTO saas_plans (code, name, description, monthly_price, yearly_price, max_users, max_monthly_records, features)
VALUES
  (
    'STARTER',
    'Starter',
    'Plan inicial para operacion comercial pequena',
    99,
    990,
    50,
    2000000,
    '{"ai": false, "exports_pdf_excel": true, "support": "standard"}'::jsonb
  ),
  (
    'GROWTH',
    'Growth',
    'Plan recomendado para equipos comerciales en expansion',
    299,
    2990,
    250,
    10000000,
    '{"ai": true, "exports_pdf_excel": true, "support": "priority"}'::jsonb
  ),
  (
    'ENTERPRISE',
    'Enterprise',
    'Plan enterprise con capacidades completas y observabilidad avanzada',
    999,
    9990,
    1000,
    50000000,
    '{"ai": true, "exports_pdf_excel": true, "support": "dedicated"}'::jsonb
  )
ON CONFLICT (code) DO NOTHING;
