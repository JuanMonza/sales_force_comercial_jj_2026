import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateSaasPlanDto } from './dto/create-saas-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateSaasPlanDto } from './dto/update-saas-plan.dto';

@Injectable()
export class SaasService {
  constructor(private readonly db: DatabaseService) {}

  private buildInvoiceNumber() {
    const datePart = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `INV-${datePart}-${rand}`;
  }

  async getPlans() {
    const { rows } = await this.db.query(
      `
        SELECT
          id,
          code,
          name,
          description,
          monthly_price,
          yearly_price,
          max_users,
          max_monthly_records,
          features,
          is_active,
          created_at,
          updated_at
        FROM saas_plans
        ORDER BY monthly_price ASC, name ASC
      `
    );
    return rows;
  }

  async createPlan(dto: CreateSaasPlanDto) {
    const { rows } = await this.db.query(
      `
        INSERT INTO saas_plans (
          code, name, description, monthly_price, yearly_price,
          max_users, max_monthly_records, features, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING *
      `,
      [
        dto.code,
        dto.name,
        dto.description ?? null,
        dto.monthlyPrice,
        dto.yearlyPrice,
        dto.maxUsers,
        dto.maxMonthlyRecords,
        JSON.stringify(dto.features ?? {}),
        dto.isActive ?? true
      ]
    );
    return rows[0];
  }

  async updatePlan(id: string, dto: UpdateSaasPlanDto) {
    const { rowCount } = await this.db.query(
      `
        UPDATE saas_plans
        SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          monthly_price = COALESCE($4, monthly_price),
          yearly_price = COALESCE($5, yearly_price),
          max_users = COALESCE($6, max_users),
          max_monthly_records = COALESCE($7, max_monthly_records),
          features = COALESCE($8::jsonb, features),
          is_active = COALESCE($9, is_active),
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        dto.name ?? null,
        dto.description ?? null,
        dto.monthlyPrice ?? null,
        dto.yearlyPrice ?? null,
        dto.maxUsers ?? null,
        dto.maxMonthlyRecords ?? null,
        dto.features ? JSON.stringify(dto.features) : null,
        typeof dto.isActive === 'boolean' ? dto.isActive : null
      ]
    );

    if (!rowCount) {
      throw new NotFoundException('Plan SaaS no encontrado');
    }

    const { rows } = await this.db.query('SELECT * FROM saas_plans WHERE id = $1 LIMIT 1', [id]);
    return rows[0];
  }

  async getSubscriptions(actor: RequestUser) {
    const { rows } = await this.db.query(
      `
        SELECT
          ts.id,
          ts.tenant_id,
          ts.plan_id,
          sp.code AS plan_code,
          sp.name AS plan_name,
          ts.status,
          ts.starts_at,
          ts.ends_at,
          ts.billing_cycle,
          ts.amount,
          ts.auto_renew,
          ts.created_at,
          ts.updated_at
        FROM tenant_subscriptions ts
        JOIN saas_plans sp ON sp.id = ts.plan_id
        WHERE ts.tenant_id = $1
        ORDER BY ts.starts_at DESC
      `,
      [actor.tenantId]
    );
    return rows;
  }

  async createSubscription(actor: RequestUser, dto: CreateSubscriptionDto) {
    const plan = await this.db.query<{ id: string; monthly_price: number; yearly_price: number }>(
      `
        SELECT id, monthly_price, yearly_price
        FROM saas_plans
        WHERE id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [dto.planId]
    );

    if (!plan.rows[0]) {
      throw new BadRequestException('Plan SaaS invalido o inactivo');
    }

    const amount = dto.billingCycle === 'YEARLY' ? plan.rows[0].yearly_price : plan.rows[0].monthly_price;

    const { rows } = await this.db.query(
      `
        INSERT INTO tenant_subscriptions (
          tenant_id, plan_id, status, starts_at, ends_at, billing_cycle, amount, auto_renew
        ) VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5::timestamptz, $6, $7, $8)
        RETURNING *
      `,
      [
        actor.tenantId,
        dto.planId,
        dto.status,
        dto.startsAt ?? null,
        dto.endsAt ?? null,
        dto.billingCycle,
        amount,
        dto.autoRenew ?? true
      ]
    );
    return rows[0];
  }

  async getInvoices(actor: RequestUser) {
    const { rows } = await this.db.query(
      `
        SELECT
          id,
          tenant_id,
          subscription_id,
          invoice_number,
          status,
          amount,
          tax_amount,
          total_amount,
          issued_at,
          due_at,
          paid_at,
          metadata
        FROM billing_invoices
        WHERE tenant_id = $1
        ORDER BY issued_at DESC
        LIMIT 300
      `,
      [actor.tenantId]
    );
    return rows;
  }

  async createInvoice(actor: RequestUser, dto: CreateInvoiceDto) {
    const taxAmount = dto.taxAmount ?? 0;
    const totalAmount = dto.amount + taxAmount;
    const invoiceNumber = this.buildInvoiceNumber();

    const { rows } = await this.db.query(
      `
        INSERT INTO billing_invoices (
          tenant_id,
          subscription_id,
          invoice_number,
          status,
          amount,
          tax_amount,
          total_amount,
          issued_at,
          due_at,
          metadata
        ) VALUES ($1, $2, $3, 'OPEN', $4, $5, $6, NOW(), $7::timestamptz, $8::jsonb)
        RETURNING *
      `,
      [
        actor.tenantId,
        dto.subscriptionId ?? null,
        invoiceNumber,
        dto.amount,
        taxAmount,
        totalAmount,
        dto.dueAt ?? null,
        JSON.stringify(dto.metadata ?? {})
      ]
    );
    return rows[0];
  }

  async getBranding(actor: RequestUser) {
    const { rows } = await this.db.query(
      `
        SELECT
          tenant_id,
          company_name,
          logo_url,
          primary_color,
          secondary_color,
          dashboard_title,
          custom_css,
          updated_at
        FROM tenant_branding
        WHERE tenant_id = $1
        LIMIT 1
      `,
      [actor.tenantId]
    );

    if (rows[0]) {
      return rows[0];
    }

    return {
      tenant_id: actor.tenantId,
      company_name: null,
      logo_url: null,
      primary_color: null,
      secondary_color: null,
      dashboard_title: null,
      custom_css: null
    };
  }

  async updateBranding(actor: RequestUser, dto: UpdateBrandingDto) {
    await this.db.query(
      `
        INSERT INTO tenant_branding (
          tenant_id, company_name, logo_url, primary_color, secondary_color, dashboard_title, custom_css, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          company_name = COALESCE(EXCLUDED.company_name, tenant_branding.company_name),
          logo_url = COALESCE(EXCLUDED.logo_url, tenant_branding.logo_url),
          primary_color = COALESCE(EXCLUDED.primary_color, tenant_branding.primary_color),
          secondary_color = COALESCE(EXCLUDED.secondary_color, tenant_branding.secondary_color),
          dashboard_title = COALESCE(EXCLUDED.dashboard_title, tenant_branding.dashboard_title),
          custom_css = COALESCE(EXCLUDED.custom_css, tenant_branding.custom_css),
          updated_at = NOW()
      `,
      [
        actor.tenantId,
        dto.companyName ?? null,
        dto.logoUrl ?? null,
        dto.primaryColor ?? null,
        dto.secondaryColor ?? null,
        dto.dashboardTitle ?? null,
        dto.customCss ?? null
      ]
    );

    return this.getBranding(actor);
  }

  async getCustomerProfile(actor: RequestUser) {
    const [tenant, subscriptions, invoices] = await Promise.all([
      this.db.query(
        `
          SELECT id, code, name, is_active, created_at
          FROM tenants
          WHERE id = $1
          LIMIT 1
        `,
        [actor.tenantId]
      ),
      this.getSubscriptions(actor),
      this.getInvoices(actor)
    ]);

    const activeSubscription = subscriptions.find((item: any) => item.status === 'ACTIVE') ?? null;
    const totalInvoiced = invoices.reduce((acc: number, item: any) => acc + Number(item.total_amount), 0);
    const totalPending = invoices
      .filter((item: any) => item.status === 'OPEN')
      .reduce((acc: number, item: any) => acc + Number(item.total_amount), 0);

    return {
      tenant: tenant.rows[0] ?? null,
      activeSubscription,
      billing: {
        invoicesCount: invoices.length,
        totalInvoiced,
        totalPending
      }
    };
  }
}
