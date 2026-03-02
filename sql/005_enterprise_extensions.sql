CREATE TABLE IF NOT EXISTS sale_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  sale_id UUID NOT NULL,
  sale_date DATE NOT NULL,
  version_no INTEGER NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  old_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sale_id, sale_date, version_no)
);

CREATE INDEX IF NOT EXISTS ix_sale_versions_lookup
  ON sale_versions(tenant_id, sale_id, sale_date, version_no DESC);

CREATE TABLE IF NOT EXISTS ai_forecast_snapshots (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('TENANT', 'REGIONAL', 'ZONE', 'ADVISOR')),
  scope_id UUID,
  forecast_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  model_version VARCHAR(40) NOT NULL DEFAULT 'linear-v1',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_forecast_snapshots_scope
  ON ai_forecast_snapshots(tenant_id, snapshot_date DESC, scope_type, scope_id);

CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_monthly_records INTEGER NOT NULL DEFAULT 1000000,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plan_id UUID NOT NULL REFERENCES saas_plans(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_tenant_subscriptions_tenant
  ON tenant_subscriptions(tenant_id, status, starts_at DESC);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID REFERENCES tenant_subscriptions(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'OPEN', 'PAID', 'VOID')),
  amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_billing_invoices_tenant
  ON billing_invoices(tenant_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  company_name VARCHAR(200),
  logo_url TEXT,
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  dashboard_title VARCHAR(200),
  custom_css TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION nightly_refresh_job()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_analytics_views();
END;
$$;

