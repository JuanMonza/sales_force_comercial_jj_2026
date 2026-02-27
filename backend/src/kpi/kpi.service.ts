import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { DatabaseService } from '../database/database.service';
import { QueryKpiDto } from './dto/query-kpi.dto';

type MonthBounds = {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

@Injectable()
export class KpiService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService
  ) {}

  private getMonthBounds(month?: string): MonthBounds {
    const baseDate = month ? new Date(`${month}T00:00:00`) : new Date();
    const currentStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const currentEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    const previousStart = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
    const previousEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

    const format = (d: Date) => d.toISOString().slice(0, 10);
    return {
      currentStart: format(currentStart),
      currentEnd: format(currentEnd),
      previousStart: format(previousStart),
      previousEnd: format(previousEnd)
    };
  }

  private addScopeFilters(
    actor: RequestUser,
    dto: QueryKpiDto,
    params: unknown[],
    alias = 's'
  ): string[] {
    const filters = [`${alias}.tenant_id = $1`, `${alias}.deleted_at IS NULL`];

    if (actor.role === Role.DIRECTOR) {
      params.push(actor.regionalId);
      filters.push(`${alias}.regional_id = $${params.length}`);
    }
    if (actor.role === Role.COORDINADOR) {
      params.push(actor.zoneId);
      filters.push(`${alias}.zone_id = $${params.length}`);
    }
    if (actor.role === Role.ASESOR) {
      params.push(actor.userId);
      filters.push(`${alias}.advisor_id = $${params.length}`);
    }

    if (dto.regionalId) {
      params.push(dto.regionalId);
      filters.push(`${alias}.regional_id = $${params.length}`);
    }
    if (dto.zoneId) {
      params.push(dto.zoneId);
      filters.push(`${alias}.zone_id = $${params.length}`);
    }
    if (dto.advisorId) {
      params.push(dto.advisorId);
      filters.push(`${alias}.advisor_id = $${params.length}`);
    }
    if (dto.directorId) {
      params.push(dto.directorId);
      filters.push(`${alias}.director_id = $${params.length}`);
    }
    if (dto.coordinatorId) {
      params.push(dto.coordinatorId);
      filters.push(`${alias}.coordinator_id = $${params.length}`);
    }
    if (dto.statusId) {
      params.push(dto.statusId);
      filters.push(`${alias}.status_id = $${params.length}`);
    }
    if (dto.planId) {
      params.push(dto.planId);
      filters.push(`${alias}.plan_id = $${params.length}`);
    }
    if (dto.quincena) {
      if (dto.quincena === 1) {
        filters.push(`EXTRACT(DAY FROM ${alias}.sale_date) BETWEEN 1 AND 15`);
      } else {
        filters.push(`EXTRACT(DAY FROM ${alias}.sale_date) BETWEEN 16 AND 31`);
      }
    }

    return filters;
  }

  async getSalesSummary(actor: RequestUser, dto: QueryKpiDto) {
    const cacheKey = `kpi:summary:${actor.tenantId}:${actor.userId}:${JSON.stringify(dto)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const bounds = this.getMonthBounds(dto.month);
    const params: unknown[] = [actor.tenantId];
    const filters = this.addScopeFilters(actor, dto, params);

    params.push(bounds.currentStart, bounds.currentEnd, bounds.previousStart, bounds.previousEnd);
    const currentStartPos = params.length - 3;
    const currentEndPos = params.length - 2;
    const previousStartPos = params.length - 1;
    const previousEndPos = params.length;

    const { rows } = await this.db.query(
      `
      WITH filtered AS (
        SELECT s.*
        FROM sales s
        WHERE ${filters.join(' AND ')}
      ),
      current_month AS (
        SELECT
          COUNT(*)::int AS total_sales,
          COALESCE(SUM(sale_amount), 0)::numeric(16,2) AS nominal_reported
        FROM filtered
        WHERE sale_date >= $${currentStartPos}::date
          AND sale_date < $${currentEndPos}::date
      ),
      previous_month AS (
        SELECT
          COUNT(*)::int AS total_sales,
          COALESCE(SUM(sale_amount), 0)::numeric(16,2) AS nominal_reported
        FROM filtered
        WHERE sale_date >= $${previousStartPos}::date
          AND sale_date < $${previousEndPos}::date
      )
      SELECT
        c.total_sales AS current_total_sales,
        c.nominal_reported AS current_nominal_reported,
        p.total_sales AS previous_total_sales,
        p.nominal_reported AS previous_nominal_reported,
        (c.total_sales - p.total_sales) AS total_sales_variation,
        (c.nominal_reported - p.nominal_reported)::numeric(16,2) AS nominal_variation,
        CASE
          WHEN p.nominal_reported = 0 THEN NULL
          ELSE ROUND(((c.nominal_reported - p.nominal_reported) / p.nominal_reported) * 100, 2)
        END AS nominal_variation_pct
      FROM current_month c
      CROSS JOIN previous_month p
      `,
      params
    );

    const response = {
      month: bounds.currentStart.slice(0, 7),
      ...rows[0]
    };

    await this.cache.set(cacheKey, response, 180);
    return response;
  }

  async getAdvisorCompliance(actor: RequestUser, dto: QueryKpiDto, previous = false) {
    const bounds = this.getMonthBounds(dto.month);
    const periodStart = previous ? bounds.previousStart : bounds.currentStart;
    const periodEnd = previous ? bounds.previousEnd : bounds.currentEnd;
    const params: unknown[] = [actor.tenantId];
    const filters = this.addScopeFilters(actor, dto, params);
    params.push(periodStart, periodEnd, periodStart);
    const periodStartPos = params.length - 2;
    const periodEndPos = params.length - 1;
    const budgetMonthPos = params.length;

    const { rows } = await this.db.query(
      `
      WITH sales_by_advisor AS (
        SELECT
          s.advisor_id,
          s.director_id,
          s.regional_id,
          s.zone_id,
          COUNT(*)::int AS cantidad_ventas,
          COALESCE(SUM(s.sale_amount), 0)::numeric(16,2) AS llevamos
        FROM sales s
        WHERE ${filters.join(' AND ')}
          AND s.sale_date >= $${periodStartPos}::date
          AND s.sale_date < $${periodEndPos}::date
        GROUP BY s.advisor_id, s.director_id, s.regional_id, s.zone_id
      )
      SELECT
        d.first_name || ' ' || d.last_name AS director,
        r.name AS regional,
        z.name AS zona,
        a.document_id AS cedula_asesor,
        a.first_name || ' ' || a.last_name AS nombre_asesor,
        ap.category AS categoria,
        COALESCE(b.target_amount, 0)::numeric(16,2) AS presupuesto,
        sba.llevamos,
        sba.cantidad_ventas,
        (COALESCE(b.target_amount, 0) - sba.llevamos)::numeric(16,2) AS nos_falta,
        CASE
          WHEN COALESCE(b.target_amount, 0) = 0 THEN 0
          ELSE ROUND((sba.llevamos / b.target_amount) * 100, 2)
        END AS cumplimiento_pct,
        $${budgetMonthPos}::date AS mes_registro,
        NOW()::date AS fecha_registro
      FROM sales_by_advisor sba
      JOIN users a ON a.id = sba.advisor_id
      LEFT JOIN users d ON d.id = sba.director_id
      JOIN zones z ON z.id = sba.zone_id
      JOIN regionals r ON r.id = sba.regional_id
      LEFT JOIN advisor_profiles ap ON ap.user_id = sba.advisor_id
      LEFT JOIN budgets b ON b.tenant_id = $1
        AND b.scope_type = 'ADVISOR'
        AND b.scope_id = sba.advisor_id
        AND b.month_date = $${budgetMonthPos}::date
        AND b.deleted_at IS NULL
      ORDER BY cumplimiento_pct ASC, sba.llevamos ASC
      `,
      params
    );

    const now = new Date();
    const periodDate = new Date(`${periodStart}T00:00:00`);
    const totalDaysInMonth = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate();
    const currentDay = Math.min(now.getDate(), totalDaysInMonth);
    const daysElapsed = previous ? totalDaysInMonth : Math.max(currentDay, 1);
    const daysLeft = previous ? 0 : Math.max(totalDaysInMonth - currentDay, 1);

    return rows.map((row: any) => {
      const presupuesto = Number(row.presupuesto);
      const llevamos = Number(row.llevamos);
      const nosFalta = Math.max(presupuesto - llevamos, 0);
      const proyeccionCierre = daysElapsed > 0 ? Number(((llevamos / daysElapsed) * totalDaysInMonth).toFixed(2)) : 0;
      const porcentajeProyeccion =
        presupuesto > 0 ? Number(((proyeccionCierre / presupuesto) * 100).toFixed(2)) : 0;
      const debemosHacerDiario = previous ? null : Number((nosFalta / daysLeft).toFixed(2));

      return {
        director: row.director,
        regional: row.regional,
        zona: row.zona,
        cedulaAsesor: row.cedula_asesor,
        nombreAsesor: row.nombre_asesor,
        categoria: row.categoria,
        presupuesto,
        llevamos,
        cantidadVentas: Number(row.cantidad_ventas),
        nosFalta,
        debemosHacerDiario,
        porcentajeCumplimiento: Number(row.cumplimiento_pct),
        proyeccionCierre,
        porcentajeProyeccion,
        fechaRegistro: row.fecha_registro,
        mesRegistro: row.mes_registro
      };
    });
  }

  async getRegionalProgress(actor: RequestUser, dto: QueryKpiDto, previous = false) {
    const bounds = this.getMonthBounds(dto.month);
    const periodStart = previous ? bounds.previousStart : bounds.currentStart;
    const periodEnd = previous ? bounds.previousEnd : bounds.currentEnd;
    const params: unknown[] = [actor.tenantId];
    const filters = this.addScopeFilters(actor, dto, params);

    params.push(periodStart, periodEnd, periodStart);
    const periodStartPos = params.length - 2;
    const periodEndPos = params.length - 1;
    const budgetMonthPos = params.length;

    const { rows } = await this.db.query(
      `
      WITH sales_by_regional AS (
        SELECT
          s.regional_id,
          COALESCE(SUM(s.sale_amount), 0)::numeric(16,2) AS llevamos,
          COALESCE(SUM(CASE WHEN sc.is_approved THEN s.approved_amount ELSE 0 END), 0)::numeric(16,2) AS aprobado,
          COALESCE(SUM(CASE WHEN s.is_fallen THEN s.sale_amount ELSE 0 END), 0)::numeric(16,2) AS caidas
        FROM sales s
        LEFT JOIN status_catalog sc ON sc.id = s.status_id
        WHERE ${filters.join(' AND ')}
          AND s.sale_date >= $${periodStartPos}::date
          AND s.sale_date < $${periodEndPos}::date
        GROUP BY s.regional_id
      )
      SELECT
        r.id AS regional_id,
        r.name AS regional,
        COALESCE(b.target_amount, 0)::numeric(16,2) AS presupuesto_100,
        sbr.llevamos,
        (COALESCE(b.target_amount, 0) - sbr.llevamos)::numeric(16,2) AS falta,
        COALESCE(b.target_120_amount, 0)::numeric(16,2) AS presupuesto_120,
        sbr.aprobado,
        sbr.caidas
      FROM sales_by_regional sbr
      JOIN regionals r ON r.id = sbr.regional_id
      LEFT JOIN budgets b ON b.tenant_id = $1
        AND b.scope_type = 'REGIONAL'
        AND b.scope_id = sbr.regional_id
        AND b.month_date = $${budgetMonthPos}::date
        AND b.deleted_at IS NULL
      ORDER BY r.name
      `,
      params
    );

    const periodDate = new Date(`${periodStart}T00:00:00`);
    const totalDaysInMonth = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate();
    const now = new Date();
    const currentDay = Math.min(now.getDate(), totalDaysInMonth);
    const daysElapsed = previous ? totalDaysInMonth : Math.max(currentDay, 1);
    const daysLeft = previous ? 0 : Math.max(totalDaysInMonth - currentDay, 1);

    return rows.map((row: any) => {
      const presupuesto100 = Number(row.presupuesto_100);
      const presupuesto120 = Number(row.presupuesto_120);
      const llevamos = Number(row.llevamos);
      const falta = Math.max(presupuesto100 - llevamos, 0);
      const cumplimiento100 = presupuesto100 > 0 ? Number(((llevamos / presupuesto100) * 100).toFixed(2)) : 0;
      const cumplimiento120 = presupuesto120 > 0 ? Number(((llevamos / presupuesto120) * 100).toFixed(2)) : 0;
      const proyeccionCierre = daysElapsed > 0 ? Number(((llevamos / daysElapsed) * totalDaysInMonth).toFixed(2)) : 0;
      const metaDiaria = previous ? null : Number((falta / daysLeft).toFixed(2));

      const aprobado = Number(row.aprobado);
      const caidas = Number(row.caidas);
      const pctAprobadoCumplimiento = presupuesto100 > 0 ? Number(((aprobado / presupuesto100) * 100).toFixed(2)) : 0;
      const pctAprobadoVsCantado = llevamos > 0 ? Number(((aprobado / llevamos) * 100).toFixed(2)) : 0;
      const pctCaidasVsCantadas = llevamos > 0 ? Number(((caidas / llevamos) * 100).toFixed(2)) : 0;

      return {
        regional: row.regional,
        presupuesto100,
        llevamos,
        porcentajeCumplimiento100: cumplimiento100,
        falta,
        metaDiariaRequerida: metaDiaria,
        presupuesto120,
        porcentajeCumplimiento120: cumplimiento120,
        proyeccionCierre,
        aprobado: previous ? aprobado : undefined,
        porcentajeCumplimientoAprobado: previous ? pctAprobadoCumplimiento : undefined,
        porcentajeAprobadoVsCantado: previous ? pctAprobadoVsCantado : undefined,
        porcentajeCaidasVsCantadas: previous ? pctCaidasVsCantadas : undefined
      };
    });
  }

  async getDailySales(actor: RequestUser, dto: QueryKpiDto) {
    const bounds = this.getMonthBounds(dto.month);
    const params: unknown[] = [actor.tenantId];
    const filters = this.addScopeFilters(actor, dto, params);
    params.push(bounds.previousStart, bounds.currentEnd);
    const fromPos = params.length - 1;
    const toPos = params.length;

    const { rows } = await this.db.query(
      `
      SELECT
        r.name AS regional,
        z.name AS zona,
        u.document_id AS cedula_asesor,
        (u.first_name || ' ' || u.last_name) AS nombre_asesor,
        s.sale_date AS fecha_diligenciamiento,
        COUNT(*)::int AS cantidad_ventas,
        COALESCE(SUM(s.sale_amount), 0)::numeric(16,2) AS nominal
      FROM sales s
      JOIN users u ON u.id = s.advisor_id
      JOIN zones z ON z.id = s.zone_id
      JOIN regionals r ON r.id = s.regional_id
      WHERE ${filters.join(' AND ')}
        AND s.sale_date >= $${fromPos}::date
        AND s.sale_date < $${toPos}::date
      GROUP BY r.name, z.name, u.document_id, u.first_name, u.last_name, s.sale_date
      ORDER BY s.sale_date DESC, nominal DESC
      `,
      params
    );

    return rows;
  }

  async getReportingTracking(actor: RequestUser) {
    const params: unknown[] = [actor.tenantId];
    const filters: string[] = ['s.tenant_id = $1', 's.deleted_at IS NULL'];

    if (actor.role === Role.DIRECTOR) {
      params.push(actor.regionalId);
      filters.push(`s.regional_id = $${params.length}`);
    }
    if (actor.role === Role.COORDINADOR) {
      params.push(actor.zoneId);
      filters.push(`s.zone_id = $${params.length}`);
    }
    if (actor.role === Role.ASESOR) {
      params.push(actor.userId);
      filters.push(`s.advisor_id = $${params.length}`);
    }

    const { rows } = await this.db.query(
      `
      SELECT
        COUNT(DISTINCT CASE WHEN s.reported_at >= date_trunc('month', NOW()) THEN s.advisor_id END)::int AS reportado_mes,
        COUNT(DISTINCT CASE WHEN s.reported_at >= date_trunc('week', NOW()) - interval '7 day'
          AND s.reported_at < date_trunc('week', NOW()) THEN s.advisor_id END)::int AS reportado_semana_pasada,
        COUNT(DISTINCT CASE WHEN s.reported_at >= date_trunc('week', NOW()) THEN s.advisor_id END)::int AS reportado_esta_semana,
        COUNT(DISTINCT CASE WHEN s.reported_at::date = NOW()::date THEN s.advisor_id END)::int AS reportado_hoy
      FROM sales s
      WHERE ${filters.join(' AND ')}
      `,
      params
    );

    return rows[0];
  }
}

