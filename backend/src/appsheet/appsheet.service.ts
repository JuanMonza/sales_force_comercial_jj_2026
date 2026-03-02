import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

type AdvisorRow = {
  user_id: string;
  tenant_id: string;
  zone_id: string;
  regional_id: string;
  full_name: string;
  document_id: string | null;
  email: string;
  category: string;
};

type CatalogRow = { id: string; name: string };

type SaleRow = {
  id: string;
  sale_date: string;
  sale_amount: string;
  approved_amount: string;
  is_fallen: boolean;
  plan_name: string | null;
  status_name: string | null;
  note: string | null;
  created_at: string;
};

@Injectable()
export class AppsheetService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService
  ) {}

  validateApiKey(apiKey: string) {
    const expected = this.config.get<string>('APPSHEET_API_KEY') ?? 'appsheet-key-default';
    if (apiKey !== expected) {
      throw new UnauthorizedException('API key invalida');
    }
  }

  async getAdvisorByDocument(document: string, tenantId: string): Promise<AdvisorRow> {
    const { rows } = await this.db.query<AdvisorRow>(
      `
      SELECT
        u.id AS user_id,
        u.tenant_id,
        ap.zone_id,
        z.regional_id,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.document_id,
        u.email,
        ap.category
      FROM users u
      JOIN roles r ON r.id = u.role_id
      JOIN advisor_profiles ap ON ap.user_id = u.id
      JOIN zones z ON z.id = ap.zone_id
      WHERE u.tenant_id = $1
        AND u.document_id = $2
        AND r.role_key = 'ASESOR'
        AND u.is_active = TRUE
        AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [tenantId, document]
    );

    const advisor = rows[0];
    if (!advisor) {
      throw new NotFoundException(`No se encontro asesor activo con cedula ${document}`);
    }
    return advisor;
  }

  async getCatalogs(tenantId: string) {
    const [plansRes, statusesRes, servicesRes] = await Promise.all([
      this.db.query<CatalogRow>(`SELECT id, name FROM plans WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name`, [tenantId]),
      this.db.query<CatalogRow>(`SELECT id, name FROM statuses WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name`, [tenantId]),
      this.db.query<CatalogRow>(`SELECT id, name FROM additional_services WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name`, [tenantId])
    ]);

    return {
      plans: plansRes.rows,
      statuses: statusesRes.rows,
      services: servicesRes.rows
    };
  }

  async getAdvisorSales(advisorId: string, tenantId: string, limit = 50): Promise<SaleRow[]> {
    const { rows } = await this.db.query<SaleRow>(
      `
      SELECT
        s.id,
        s.sale_date::text,
        s.sale_amount::text,
        s.approved_amount::text,
        s.is_fallen,
        p.name AS plan_name,
        st.name AS status_name,
        s.note,
        s.created_at::text
      FROM sales s
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN statuses st ON st.id = s.status_id
      WHERE s.tenant_id = $1
        AND s.advisor_id = $2
      ORDER BY s.sale_date DESC, s.created_at DESC
      LIMIT $3
      `,
      [tenantId, advisorId, limit]
    );
    return rows;
  }

  async createSale(
    advisorId: string,
    zoneId: string,
    regionalId: string,
    tenantId: string,
    body: {
      saleAmount: number;
      saleDate: string;
      planId?: string;
      statusId?: string;
      note?: string;
      advisorDocument: string;
    }
  ) {
    // Resolver coordinator_id y director_id desde la jerarquia
    const hierRes = await this.db.query<{ coordinator_id: string | null; director_id: string | null }>(
      `
      SELECT
        (SELECT u.id FROM users u JOIN coordinator_profiles cp ON cp.user_id = u.id WHERE cp.zone_id = $2 AND u.tenant_id = $1 AND u.deleted_at IS NULL LIMIT 1) AS coordinator_id,
        (SELECT u.id FROM users u JOIN director_profiles dp ON dp.user_id = u.id WHERE dp.regional_id = $3 AND u.tenant_id = $1 AND u.deleted_at IS NULL LIMIT 1) AS director_id
      `,
      [tenantId, zoneId, regionalId]
    );

    const { coordinator_id, director_id } = hierRes.rows[0] ?? {};

    const { rows } = await this.db.query<{ id: string }>(
      `
      INSERT INTO sales (
        tenant_id, advisor_id, coordinator_id, director_id,
        zone_id, regional_id, plan_id, status_id,
        sale_amount, approved_amount, is_fallen, sale_date, note, reported_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $9, FALSE, $10, $11, NOW()
      ) RETURNING id
      `,
      [
        tenantId, advisorId, coordinator_id ?? null, director_id ?? null,
        zoneId, regionalId, body.planId ?? null, body.statusId ?? null,
        body.saleAmount, body.saleDate, body.note ?? null
      ]
    );

    return { id: rows[0].id, message: 'Venta registrada correctamente' };
  }
}
