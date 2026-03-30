import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { DatabaseService } from '../database/database.service';
import { CreateAppsheetSaleDto } from './dto/create-appsheet-sale.dto';

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

type CreateSaleResult = {
  id: string;
  message: string;
  idempotentReplay?: boolean;
};

@Injectable()
export class AppsheetService {
  private readonly idempotencyResultTtlSeconds: number;
  private readonly idempotencyLockTtlSeconds: number;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly cache: CacheService
  ) {
    this.idempotencyResultTtlSeconds = Number(
      this.config.get<string>('APPSHEET_IDEMPOTENCY_TTL_SECONDS', '86400')
    );
    this.idempotencyLockTtlSeconds = Number(
      this.config.get<string>('APPSHEET_IDEMPOTENCY_LOCK_TTL_SECONDS', '30')
    );
  }

  validateApiKey(headerApiKey?: string, queryApiKey?: string) {
    const expected = this.config.get<string>('APPSHEET_API_KEY');
    if (!expected || expected.trim().length < 16) {
      throw new UnauthorizedException('APPSHEET_API_KEY no configurada de forma segura');
    }

    const activeKey = (headerApiKey ?? '').trim();
    if (activeKey.length > 0) {
      if (activeKey !== expected) {
        throw new UnauthorizedException('API key invalida');
      }
      return;
    }

    if (this.config.get<string>('NODE_ENV', 'development') === 'production') {
      throw new UnauthorizedException('En produccion la API key debe enviarse en header x-api-key');
    }

    const legacyKey = (queryApiKey ?? '').trim();
    if (legacyKey !== expected) {
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
    body: CreateAppsheetSaleDto,
    idempotencyKey?: string
  ): Promise<CreateSaleResult> {
    const normalizedIdempotencyKey = (idempotencyKey ?? '').trim();
    if (!normalizedIdempotencyKey) {
      throw new BadRequestException('Header x-idempotency-key es obligatorio');
    }

    const resultKey = `appsheet:idempotency:result:${tenantId}:${normalizedIdempotencyKey}`;
    const lockKey = `appsheet:idempotency:lock:${tenantId}:${normalizedIdempotencyKey}`;

    const cachedResult = await this.cache.get<CreateSaleResult>(resultKey);
    if (cachedResult) {
      return { ...cachedResult, idempotentReplay: true };
    }

    const lockAcquired = await this.cache.setIfNotExists(
      lockKey,
      { createdAt: new Date().toISOString() },
      this.idempotencyLockTtlSeconds
    );
    if (!lockAcquired) {
      const resultAfterLock = await this.cache.get<CreateSaleResult>(resultKey);
      if (resultAfterLock) {
        return { ...resultAfterLock, idempotentReplay: true };
      }
      throw new ConflictException('Solicitud duplicada en proceso, intenta de nuevo en unos segundos');
    }

    try {
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

      const response: CreateSaleResult = { id: rows[0].id, message: 'Venta registrada correctamente' };
      await this.cache.set(resultKey, response, this.idempotencyResultTtlSeconds);
      return response;
    } finally {
      await this.cache.del(lockKey);
    }
  }
}
