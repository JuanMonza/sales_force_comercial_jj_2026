import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { DatabaseService } from '../database/database.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';

type AdvisorScopeRow = {
  advisor_id: string;
  zone_id: string;
  regional_id: string;
};

@Injectable()
export class SalesService {
  constructor(private readonly db: DatabaseService) {}

  private buildRoleScope(user: RequestUser, params: unknown[]) {
    if (user.role === Role.DIRECTOR) {
      params.push(user.regionalId);
      return ` AND s.regional_id = $${params.length}`;
    }
    if (user.role === Role.COORDINADOR) {
      params.push(user.zoneId);
      return ` AND s.zone_id = $${params.length}`;
    }
    if (user.role === Role.ASESOR) {
      params.push(user.userId);
      return ` AND s.advisor_id = $${params.length}`;
    }
    return '';
  }

  private async resolveAdvisorForSale(actor: RequestUser, advisorId?: string) {
    if (actor.role === Role.ASESOR) {
      advisorId = actor.userId;
    }

    if (!advisorId) {
      throw new BadRequestException('advisorId es obligatorio');
    }

    const { rows } = await this.db.query<AdvisorScopeRow>(
      `
        SELECT
          ap.user_id AS advisor_id,
          ap.zone_id,
          z.regional_id
        FROM advisor_profiles ap
        JOIN zones z ON z.id = ap.zone_id
        JOIN users u ON u.id = ap.user_id
        WHERE u.tenant_id = $1
          AND ap.user_id = $2
          AND u.deleted_at IS NULL
      `,
      [actor.tenantId, advisorId]
    );

    const advisor = rows[0];
    if (!advisor) {
      throw new BadRequestException('Asesor no encontrado');
    }

    if (actor.role === Role.DIRECTOR && actor.regionalId !== advisor.regional_id) {
      throw new BadRequestException('No puedes registrar ventas fuera de tu regional');
    }
    if (actor.role === Role.COORDINADOR && actor.zoneId !== advisor.zone_id) {
      throw new BadRequestException('No puedes registrar ventas fuera de tu zona');
    }

    return advisor;
  }

  async create(actor: RequestUser, dto: CreateSaleDto) {
    const advisor = await this.resolveAdvisorForSale(actor, dto.advisorId);

    const coordinatorResult = await this.db.query<{ user_id: string }>(
      'SELECT user_id FROM coordinator_profiles WHERE zone_id = $1 LIMIT 1',
      [advisor.zone_id]
    );
    const directorResult = await this.db.query<{ user_id: string }>(
      'SELECT user_id FROM director_profiles WHERE regional_id = $1 LIMIT 1',
      [advisor.regional_id]
    );

    const insertSale = await this.db.query<{ id: string; sale_date: string }>(
      `
      INSERT INTO sales (
        tenant_id, advisor_id, coordinator_id, director_id, regional_id, zone_id, plan_id, status_id,
        sale_amount, approved_amount, is_fallen, sale_date, note, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      RETURNING id, sale_date
      `,
      [
        actor.tenantId,
        advisor.advisor_id,
        coordinatorResult.rows[0]?.user_id ?? null,
        directorResult.rows[0]?.user_id ?? null,
        advisor.regional_id,
        advisor.zone_id,
        dto.planId ?? null,
        dto.statusId ?? null,
        dto.saleAmount,
        dto.approvedAmount ?? 0,
        dto.isFallen ?? false,
        dto.saleDate,
        dto.note ?? null,
        actor.userId
      ]
    );

    const sale = insertSale.rows[0];

    if (dto.services?.length) {
      for (const serviceItem of dto.services) {
        await this.db.query(
          `
            INSERT INTO sale_services (tenant_id, sale_id, sale_date, service_id, quantity, nominal_amount)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            actor.tenantId,
            sale.id,
            sale.sale_date,
            serviceItem.serviceId,
            serviceItem.quantity,
            serviceItem.nominalAmount
          ]
        );
      }
    }

    return {
      created: true,
      saleId: sale.id
    };
  }

  async findAll(actor: RequestUser, query: QuerySalesDto) {
    const params: unknown[] = [actor.tenantId];
    const filters: string[] = ['s.tenant_id = $1', 's.deleted_at IS NULL'];
    const scopeFilter = this.buildRoleScope(actor, params);
    if (scopeFilter) {
      filters.push(scopeFilter.trim().replace(/^AND /, ''));
    }

    if (query.regionalId) {
      params.push(query.regionalId);
      filters.push(`s.regional_id = $${params.length}`);
    }
    if (query.zoneId) {
      params.push(query.zoneId);
      filters.push(`s.zone_id = $${params.length}`);
    }
    if (query.advisorId) {
      params.push(query.advisorId);
      filters.push(`s.advisor_id = $${params.length}`);
    }
    if (query.directorId) {
      params.push(query.directorId);
      filters.push(`s.director_id = $${params.length}`);
    }
    if (query.coordinatorId) {
      params.push(query.coordinatorId);
      filters.push(`s.coordinator_id = $${params.length}`);
    }
    if (query.statusId) {
      params.push(query.statusId);
      filters.push(`s.status_id = $${params.length}`);
    }
    if (query.planId) {
      params.push(query.planId);
      filters.push(`s.plan_id = $${params.length}`);
    }
    if (query.startDate) {
      params.push(query.startDate);
      filters.push(`s.sale_date >= $${params.length}::date`);
    }
    if (query.endDate) {
      params.push(query.endDate);
      filters.push(`s.sale_date <= $${params.length}::date`);
    }
    if (query.quincena) {
      params.push(query.quincena === 1 ? 1 : 16);
      if (query.quincena === 1) {
        filters.push(`EXTRACT(DAY FROM s.sale_date) BETWEEN 1 AND 15`);
      } else {
        filters.push(`EXTRACT(DAY FROM s.sale_date) BETWEEN 16 AND 31`);
      }
    }

    params.push(query.limit ?? 100);
    const limitPos = params.length;
    params.push(query.offset ?? 0);
    const offsetPos = params.length;

    const sql = `
      SELECT
        s.id,
        s.sale_date,
        s.reported_at,
        s.sale_amount,
        s.approved_amount,
        s.is_fallen,
        s.note,
        s.advisor_id,
        (ua.first_name || ' ' || ua.last_name) AS advisor_name,
        s.coordinator_id,
        (uc.first_name || ' ' || uc.last_name) AS coordinator_name,
        s.director_id,
        (ud.first_name || ' ' || ud.last_name) AS director_name,
        s.regional_id,
        r.name AS regional_name,
        s.zone_id,
        z.name AS zone_name,
        s.plan_id,
        p.name AS plan_name,
        s.status_id,
        sc.name AS status_name
      FROM sales s
      LEFT JOIN users ua ON ua.id = s.advisor_id
      LEFT JOIN users uc ON uc.id = s.coordinator_id
      LEFT JOIN users ud ON ud.id = s.director_id
      LEFT JOIN regionals r ON r.id = s.regional_id
      LEFT JOIN zones z ON z.id = s.zone_id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN status_catalog sc ON sc.id = s.status_id
      WHERE ${filters.join(' AND ')}
      ORDER BY s.sale_date DESC, s.created_at DESC
      LIMIT $${limitPos}
      OFFSET $${offsetPos}
    `;

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  async getCatalogs(actor: RequestUser) {
    const tenantId = actor.tenantId;
    let regionalIds: string[] = [];
    let zoneIds: string[] = [];

    if (actor.role === Role.DIRECTOR && actor.regionalId) {
      regionalIds = [actor.regionalId];
    } else if (actor.role === Role.COORDINADOR && actor.zoneId) {
      zoneIds = [actor.zoneId];
      const zoneResult = await this.db.query<{ regional_id: string }>(
        'SELECT regional_id FROM zones WHERE id = $1 LIMIT 1',
        [actor.zoneId]
      );
      const regionalId = zoneResult.rows[0]?.regional_id;
      if (regionalId) {
        regionalIds = [regionalId];
      }
    } else if (actor.role === Role.ASESOR && actor.zoneId) {
      zoneIds = [actor.zoneId];
      const zoneResult = await this.db.query<{ regional_id: string }>(
        'SELECT regional_id FROM zones WHERE id = $1 LIMIT 1',
        [actor.zoneId]
      );
      const regionalId = zoneResult.rows[0]?.regional_id;
      if (regionalId) {
        regionalIds = [regionalId];
      }
    }

    const regionalsWhere = regionalIds.length
      ? `AND r.id = ANY($2::uuid[])`
      : '';
    const zonesWhere = zoneIds.length
      ? `AND z.id = ANY($2::uuid[])`
      : regionalIds.length
        ? `AND z.regional_id = ANY($2::uuid[])`
        : '';

    const regionalsParams: unknown[] = [tenantId];
    if (regionalIds.length) {
      regionalsParams.push(regionalIds);
    }

    const zonesParams: unknown[] = [tenantId];
    if (zoneIds.length) {
      zonesParams.push(zoneIds);
    } else if (regionalIds.length) {
      zonesParams.push(regionalIds);
    }

    const [regionals, zones, directors, coordinators, advisors, plans, statuses, services] = await Promise.all([
      this.db.query(
        `
          SELECT r.id, r.code, r.name
          FROM regionals r
          WHERE r.tenant_id = $1
            AND r.deleted_at IS NULL
            ${regionalsWhere}
          ORDER BY r.name
        `,
        regionalsParams
      ),
      this.db.query(
        `
          SELECT z.id, z.code, z.name, z.regional_id
          FROM zones z
          WHERE z.tenant_id = $1
            AND z.deleted_at IS NULL
            ${zonesWhere}
          ORDER BY z.name
        `,
        zonesParams
      ),
      this.db.query(
        `
          SELECT u.id, (u.first_name || ' ' || u.last_name) AS name
          FROM users u
          JOIN roles r ON r.id = u.role_id AND r.role_key = 'DIRECTOR'
          WHERE u.tenant_id = $1
            AND u.deleted_at IS NULL
          ORDER BY name
        `,
        [tenantId]
      ),
      this.db.query(
        `
          SELECT u.id, (u.first_name || ' ' || u.last_name) AS name
          FROM users u
          JOIN roles r ON r.id = u.role_id AND r.role_key = 'COORDINADOR'
          WHERE u.tenant_id = $1
            AND u.deleted_at IS NULL
          ORDER BY name
        `,
        [tenantId]
      ),
      this.db.query(
        `
          SELECT u.id, (u.first_name || ' ' || u.last_name) AS name
          FROM users u
          JOIN roles r ON r.id = u.role_id AND r.role_key = 'ASESOR'
          WHERE u.tenant_id = $1
            AND u.deleted_at IS NULL
          ORDER BY name
        `,
        [tenantId]
      ),
      this.db.query(
        `
          SELECT id, code, name
          FROM plans
          WHERE tenant_id = $1
            AND deleted_at IS NULL
            AND is_active = TRUE
          ORDER BY name
        `,
        [tenantId]
      ),
      this.db.query(
        `
          SELECT id, code, name
          FROM status_catalog
          WHERE tenant_id = $1
            AND deleted_at IS NULL
            AND is_active = TRUE
          ORDER BY name
        `,
        [tenantId]
      ),
      this.db.query(
        `
          SELECT id, code, name
          FROM services
          WHERE tenant_id = $1
            AND deleted_at IS NULL
            AND is_active = TRUE
          ORDER BY name
        `,
        [tenantId]
      )
    ]);

    return {
      regionals: regionals.rows,
      zones: zones.rows,
      directors: directors.rows,
      coordinators: coordinators.rows,
      advisors: advisors.rows,
      plans: plans.rows,
      statuses: statuses.rows,
      services: services.rows
    };
  }
}
