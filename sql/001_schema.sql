CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS roles (
  id SMALLSERIAL PRIMARY KEY,
  role_key VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role_id SMALLINT NOT NULL REFERENCES roles(id),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  document_id VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_tenant_email_active
  ON users(tenant_id, email)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS regionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_regionals_tenant_code_active
  ON regionals(tenant_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  regional_id UUID NOT NULL REFERENCES regionals(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_zones_tenant_code_active
  ON zones(tenant_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS director_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  regional_id UUID NOT NULL REFERENCES regionals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coordinator_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advisor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  category VARCHAR(60) NOT NULL DEFAULT 'GENERAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  base_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_plans_tenant_code_active
  ON plans(tenant_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_services_tenant_code_active
  ON services(tenant_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS status_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_status_tenant_code_active
  ON status_catalog(tenant_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  month_date DATE NOT NULL,
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('TENANT', 'REGIONAL', 'ZONE', 'ADVISOR')),
  scope_id UUID,
  target_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  target_count INTEGER NOT NULL DEFAULT 0,
  target_120_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  approved_target_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_budgets_scope_month_active
  ON budgets(tenant_id, month_date, scope_type, scope_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS sales (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  advisor_id UUID NOT NULL REFERENCES users(id),
  coordinator_id UUID REFERENCES users(id),
  director_id UUID REFERENCES users(id),
  regional_id UUID NOT NULL REFERENCES regionals(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  plan_id UUID REFERENCES plans(id),
  status_id UUID REFERENCES status_catalog(id),
  sale_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_fallen BOOLEAN NOT NULL DEFAULT FALSE,
  sale_date DATE NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (id, sale_date)
) PARTITION BY RANGE (sale_date);

CREATE INDEX IF NOT EXISTS ix_sales_tenant_sale_date ON sales(tenant_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_reported_at ON sales(tenant_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_advisor_date ON sales(tenant_id, advisor_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_zone_date ON sales(tenant_id, zone_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_regional_date ON sales(tenant_id, regional_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_status_date ON sales(tenant_id, status_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_plan_date ON sales(tenant_id, plan_id, sale_date DESC);

CREATE TABLE IF NOT EXISTS sale_services (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sale_id UUID NOT NULL,
  sale_date DATE NOT NULL,
  service_id UUID NOT NULL REFERENCES services(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  nominal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sale_id, sale_date, service_id),
  CONSTRAINT fk_sale_services_sales FOREIGN KEY (sale_id, sale_date)
    REFERENCES sales(id, sale_date)
);

CREATE INDEX IF NOT EXISTS ix_sale_services_service ON sale_services(service_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  table_name VARCHAR(120) NOT NULL,
  record_pk JSONB NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_created_at
  ON audit_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_audit_logs_table_name
  ON audit_logs(table_name, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_ref UUID;
BEGIN
  tenant_ref := COALESCE(NEW.tenant_id, OLD.tenant_id);

  INSERT INTO audit_logs (tenant_id, user_id, table_name, record_pk, action, old_data, new_data)
  VALUES (
    tenant_ref,
    NULL,
    TG_TABLE_NAME,
    jsonb_build_object('id', COALESCE(NEW.id, OLD.id)),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_regionals_updated_at ON regionals;
CREATE TRIGGER trg_regionals_updated_at
BEFORE UPDATE ON regionals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_zones_updated_at ON zones;
CREATE TRIGGER trg_zones_updated_at
BEFORE UPDATE ON zones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_status_catalog_updated_at ON status_catalog;
CREATE TRIGGER trg_status_catalog_updated_at
BEFORE UPDATE ON status_catalog
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON budgets;
CREATE TRIGGER trg_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_audit ON users;
CREATE TRIGGER trg_users_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION write_audit_log();

DROP TRIGGER IF EXISTS trg_budgets_audit ON budgets;
CREATE TRIGGER trg_budgets_audit
AFTER INSERT OR UPDATE OR DELETE ON budgets
FOR EACH ROW EXECUTE FUNCTION write_audit_log();

DROP TRIGGER IF EXISTS trg_sales_audit ON sales;
CREATE TRIGGER trg_sales_audit
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_sales_summary AS
SELECT
  s.tenant_id,
  date_trunc('month', s.sale_date)::date AS month_date,
  s.regional_id,
  s.zone_id,
  COUNT(*) AS sales_count,
  SUM(s.sale_amount)::numeric(16,2) AS nominal_reported,
  SUM(CASE WHEN sc.is_approved THEN s.approved_amount ELSE 0 END)::numeric(16,2) AS nominal_approved
FROM sales s
LEFT JOIN status_catalog sc ON sc.id = s.status_id
WHERE s.deleted_at IS NULL
GROUP BY s.tenant_id, date_trunc('month', s.sale_date)::date, s.regional_id, s.zone_id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_monthly_sales_summary
  ON mv_monthly_sales_summary(tenant_id, month_date, regional_id, zone_id);

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sales_summary;
END;
$$;

