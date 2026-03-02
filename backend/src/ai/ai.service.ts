import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { DatabaseService } from '../database/database.service';
import { QueryKpiDto } from '../kpi/dto/query-kpi.dto';
import { KpiService } from '../kpi/kpi.service';
import { QueryAiDto } from './dto/query-ai.dto';

type ScopeType = 'TENANT' | 'REGIONAL' | 'ZONE' | 'ADVISOR';

type EffectiveScope = {
  scopeType: ScopeType;
  scopeId: string | null;
};

type DayNominalRow = {
  day_no: number;
  nominal: number;
};

type AdvisorAnomalyRow = {
  advisor_id: string;
  advisor_name: string;
  day: string;
  nominal: number;
  avg_nominal: number;
  std_nominal: number;
  z_score: number;
  regional: string;
  zona: string;
};

type ForecastResult = {
  month: string;
  scopeType: ScopeType;
  scopeId: string | null;
  observedNominal: number;
  forecastNominal: number;
  projectedGap: number;
  confidenceScore: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  previousMonthNominal: number;
  variationVsPreviousMonthPct: number | null;
  upperBand: number;
  lowerBand: number;
  modelVersion: string;
};

@Injectable()
export class AiService {
  constructor(
    private readonly db: DatabaseService,
    private readonly kpiService: KpiService
  ) {}

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private getMonthBounds(month?: string) {
    const input = month && month.length === 7 ? `${month}-01` : month;
    const baseDate = input ? new Date(`${input}T00:00:00`) : new Date();
    const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    const previousStart = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
    const previousEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const totalDays = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();

    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === baseDate.getFullYear() && now.getMonth() === baseDate.getMonth();
    const elapsedDays = isCurrentMonth ? Math.max(1, Math.min(now.getDate(), totalDays)) : totalDays;

    const asDate = (d: Date) => d.toISOString().slice(0, 10);
    return {
      currentStart: asDate(monthStart),
      currentEnd: asDate(monthEnd),
      previousStart: asDate(previousStart),
      previousEnd: asDate(previousEnd),
      month: asDate(monthStart).slice(0, 7),
      totalDays,
      elapsedDays
    };
  }

  private resolveScope(actor: RequestUser, dto: QueryAiDto): EffectiveScope {
    if (actor.role === Role.DIRECTOR) {
      return {
        scopeType: 'REGIONAL',
        scopeId: actor.regionalId ?? null
      };
    }
    if (actor.role === Role.COORDINADOR) {
      return {
        scopeType: 'ZONE',
        scopeId: actor.zoneId ?? null
      };
    }
    if (actor.role === Role.ASESOR) {
      return {
        scopeType: 'ADVISOR',
        scopeId: actor.userId
      };
    }

    const scopeType = dto.scopeType ?? 'TENANT';
    if (scopeType !== 'TENANT' && !dto.scopeId) {
      throw new BadRequestException('scopeId es obligatorio para el scope seleccionado');
    }
    return {
      scopeType,
      scopeId: dto.scopeId ?? null
    };
  }

  private applyScopeFilter(scope: EffectiveScope, params: unknown[], alias = 's') {
    if (scope.scopeType === 'TENANT') {
      return '';
    }

    params.push(scope.scopeId);
    const paramPos = params.length;
    if (scope.scopeType === 'REGIONAL') {
      return ` AND ${alias}.regional_id = $${paramPos}::uuid`;
    }
    if (scope.scopeType === 'ZONE') {
      return ` AND ${alias}.zone_id = $${paramPos}::uuid`;
    }
    return ` AND ${alias}.advisor_id = $${paramPos}::uuid`;
  }

  private async getDailyNominals(
    tenantId: string,
    scope: EffectiveScope,
    monthStart: string,
    monthEnd: string
  ): Promise<DayNominalRow[]> {
    const params: unknown[] = [tenantId, monthStart, monthEnd];
    const scopeFilter = this.applyScopeFilter(scope, params);
    const { rows } = await this.db.query<DayNominalRow>(
      `
        SELECT
          EXTRACT(DAY FROM s.sale_date)::int AS day_no,
          COALESCE(SUM(s.sale_amount), 0)::float8 AS nominal
        FROM sales s
        WHERE s.tenant_id = $1
          AND s.deleted_at IS NULL
          AND s.sale_date >= $2::date
          AND s.sale_date < $3::date
          ${scopeFilter}
        GROUP BY 1
        ORDER BY 1
      `,
      params
    );
    return rows;
  }

  private async getPreviousMonthNominal(
    tenantId: string,
    scope: EffectiveScope,
    previousStart: string,
    previousEnd: string
  ): Promise<number> {
    const params: unknown[] = [tenantId, previousStart, previousEnd];
    const scopeFilter = this.applyScopeFilter(scope, params);
    const { rows } = await this.db.query<{ nominal: number }>(
      `
        SELECT COALESCE(SUM(s.sale_amount), 0)::float8 AS nominal
        FROM sales s
        WHERE s.tenant_id = $1
          AND s.deleted_at IS NULL
          AND s.sale_date >= $2::date
          AND s.sale_date < $3::date
          ${scopeFilter}
      `,
      params
    );
    return Number(rows[0]?.nominal ?? 0);
  }

  private buildRegression(points: Array<{ x: number; y: number }>) {
    const n = points.length;
    if (n === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);

    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = n === 0 ? 0 : (sumY - slope * sumX) / n;

    const meanY = n === 0 ? 0 : sumY / n;
    const ssTot = points.reduce((acc, p) => acc + (p.y - meanY) ** 2, 0);
    const ssRes = points.reduce((acc, p) => {
      const predicted = slope * p.x + intercept;
      return acc + (p.y - predicted) ** 2;
    }, 0);

    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return { slope, intercept, r2: this.clamp(r2, 0, 1) };
  }

  private async persistSnapshot(tenantId: string, forecast: ForecastResult) {
    await this.db.query(
      `
        INSERT INTO ai_forecast_snapshots (
          tenant_id,
          snapshot_date,
          scope_type,
          scope_id,
          forecast_amount,
          confidence_score,
          model_version,
          metadata
        ) VALUES ($1, NOW()::date, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        tenantId,
        forecast.scopeType,
        forecast.scopeId,
        forecast.forecastNominal,
        forecast.confidenceScore,
        forecast.modelVersion,
        JSON.stringify({
          observedNominal: forecast.observedNominal,
          projectedGap: forecast.projectedGap,
          previousMonthNominal: forecast.previousMonthNominal
        })
      ]
    );
  }

  private async computeForecast(
    tenantId: string,
    scope: EffectiveScope,
    month?: string,
    persist = false
  ): Promise<ForecastResult> {
    const bounds = this.getMonthBounds(month);
    const [dailyRows, previousMonthNominal] = await Promise.all([
      this.getDailyNominals(tenantId, scope, bounds.currentStart, bounds.currentEnd),
      this.getPreviousMonthNominal(tenantId, scope, bounds.previousStart, bounds.previousEnd)
    ]);

    const dayNominals = new Map<number, number>();
    dailyRows.forEach((row) => {
      dayNominals.set(Number(row.day_no), Number(row.nominal));
    });

    const points: Array<{ x: number; y: number }> = [];
    let cumulative = 0;
    for (let day = 1; day <= bounds.elapsedDays; day += 1) {
      cumulative += Number(dayNominals.get(day) ?? 0);
      points.push({ x: day, y: cumulative });
    }
    if (!points.length) {
      points.push({ x: 1, y: 0 });
    }

    const model = this.buildRegression(points);
    const observedNominal = cumulative;
    let forecastNominal = model.intercept + model.slope * bounds.totalDays;
    if (!Number.isFinite(forecastNominal)) {
      forecastNominal = observedNominal;
    }
    forecastNominal = Math.max(observedNominal, forecastNominal, 0);

    const confidenceScore = Number((this.clamp(model.r2, 0.05, 0.999) * 100).toFixed(2));
    const projectedGap = Number((forecastNominal - observedNominal).toFixed(2));
    const variationVsPreviousMonthPct =
      previousMonthNominal > 0
        ? Number((((forecastNominal - previousMonthNominal) / previousMonthNominal) * 100).toFixed(2))
        : null;

    const trend: 'UP' | 'DOWN' | 'STABLE' =
      Math.abs(model.slope) < 1 ? 'STABLE' : model.slope >= 0 ? 'UP' : 'DOWN';
    const uncertaintyFactor = this.clamp(1 - model.r2, 0.06, 0.4);
    const upperBand = Number((forecastNominal * (1 + uncertaintyFactor)).toFixed(2));
    const lowerBand = Number((Math.max(0, forecastNominal * (1 - uncertaintyFactor))).toFixed(2));

    const forecast: ForecastResult = {
      month: bounds.month,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      observedNominal: Number(observedNominal.toFixed(2)),
      forecastNominal: Number(forecastNominal.toFixed(2)),
      projectedGap,
      confidenceScore,
      trend,
      previousMonthNominal: Number(previousMonthNominal.toFixed(2)),
      variationVsPreviousMonthPct,
      upperBand,
      lowerBand,
      modelVersion: 'linreg-v1'
    };

    if (persist) {
      await this.persistSnapshot(tenantId, forecast);
    }
    return forecast;
  }

  async getForecast(actor: RequestUser, dto: QueryAiDto) {
    const scope = this.resolveScope(actor, dto);
    return this.computeForecast(actor.tenantId, scope, dto.month, Boolean(dto.persist));
  }

  async getAnomalies(actor: RequestUser, dto: QueryAiDto) {
    const scope = this.resolveScope(actor, dto);
    const bounds = this.getMonthBounds(dto.month);
    const zScoreThreshold = dto.zScoreThreshold ?? 2.2;
    const limit = dto.limit ?? 50;

    const params: unknown[] = [actor.tenantId, bounds.currentStart, bounds.currentEnd, zScoreThreshold, limit];
    const scopeFilterForDaily = this.applyScopeFilter(scope, params, 's');

    const { rows } = await this.db.query<AdvisorAnomalyRow>(
      `
        WITH daily AS (
          SELECT
            s.advisor_id,
            s.sale_date::date AS day,
            COALESCE(SUM(s.sale_amount), 0)::float8 AS nominal
          FROM sales s
          WHERE s.tenant_id = $1
            AND s.deleted_at IS NULL
            AND s.sale_date >= $2::date
            AND s.sale_date < $3::date
            ${scopeFilterForDaily}
          GROUP BY s.advisor_id, s.sale_date::date
        ),
        stats AS (
          SELECT
            advisor_id,
            AVG(nominal)::float8 AS avg_nominal,
            COALESCE(STDDEV_POP(nominal), 0)::float8 AS std_nominal
          FROM daily
          GROUP BY advisor_id
        )
        SELECT
          d.advisor_id,
          (u.first_name || ' ' || u.last_name) AS advisor_name,
          d.day::text AS day,
          d.nominal,
          st.avg_nominal,
          st.std_nominal,
          CASE
            WHEN st.std_nominal = 0 THEN 0
            ELSE ABS((d.nominal - st.avg_nominal) / st.std_nominal)
          END AS z_score,
          r.name AS regional,
          z.name AS zona
        FROM daily d
        JOIN stats st ON st.advisor_id = d.advisor_id
        JOIN users u ON u.id = d.advisor_id
        LEFT JOIN advisor_profiles ap ON ap.user_id = d.advisor_id
        LEFT JOIN zones z ON z.id = ap.zone_id
        LEFT JOIN regionals r ON r.id = z.regional_id
        WHERE st.std_nominal > 0
          AND CASE
            WHEN st.std_nominal = 0 THEN 0
            ELSE ABS((d.nominal - st.avg_nominal) / st.std_nominal)
          END >= $4::float8
        ORDER BY z_score DESC, d.day DESC
        LIMIT $5::int
      `,
      params
    );

    return {
      month: bounds.month,
      threshold: zScoreThreshold,
      total: rows.length,
      anomalies: rows.map((row) => ({
        advisorId: row.advisor_id,
        advisorName: row.advisor_name,
        regional: row.regional,
        zona: row.zona,
        day: row.day,
        nominal: Number(row.nominal),
        average: Number(row.avg_nominal),
        stdDev: Number(row.std_nominal),
        zScore: Number(Number(row.z_score).toFixed(2))
      }))
    };
  }

  async getRecommendations(actor: RequestUser, dto: QueryAiDto) {
    const [forecast, anomaliesResponse, compliance] = await Promise.all([
      this.getForecast(actor, dto),
      this.getAnomalies(actor, {
        ...dto,
        limit: 200
      }),
      this.kpiService.getAdvisorCompliance(
        actor,
        {
          month: dto.month
        } as QueryKpiDto,
        false
      )
    ]);

    const anomalousAdvisorNames = new Set(
      anomaliesResponse.anomalies.map((item) => item.advisorName.toLowerCase())
    );

    const advisorActions = compliance
      .slice()
      .sort((a, b) => Number(a.porcentajeCumplimiento) - Number(b.porcentajeCumplimiento))
      .slice(0, 20)
      .map((item) => {
        const cumplimiento = Number(item.porcentajeCumplimiento);
        const inAnomalyList = anomalousAdvisorNames.has(item.nombreAsesor.toLowerCase());
        let priority: 'ALTA' | 'MEDIA' | 'BAJA' = 'BAJA';
        let action = 'Mantener seguimiento semanal y reforzar cierres de fin de quincena.';

        if (cumplimiento < 50 || inAnomalyList) {
          priority = 'ALTA';
          action =
            'Aplicar plan de choque de 5 dias: coaching diario, depuracion de embudo y acompanamiento de cierre.';
        } else if (cumplimiento < 80) {
          priority = 'MEDIA';
          action = 'Reforzar prospeccion y seguimiento de oportunidades con control cada 48 horas.';
        }

        return {
          advisorName: item.nombreAsesor,
          zona: item.zona,
          regional: item.regional,
          porcentajeCumplimiento: cumplimiento,
          nosFalta: Number(item.nosFalta),
          priority,
          action,
          reason: inAnomalyList ? 'Detectado con comportamiento anomalo en ventas diarias.' : 'Bajo cumplimiento.'
        };
      });

    const globalActions: string[] = [];
    if (forecast.confidenceScore < 45) {
      globalActions.push(
        'La confianza del forecast es baja. Recomendada una recalibracion diaria del modelo y validacion de datos.'
      );
    }
    if (forecast.projectedGap > 0) {
      globalActions.push(
        `El forecast proyecta ${forecast.projectedGap.toLocaleString('es-CO')} adicionales si se mantiene el ritmo actual.`
      );
    } else {
      globalActions.push(
        'El forecast no proyecta crecimiento adicional relevante. Priorizar recuperacion de asesores en riesgo.'
      );
    }
    if (anomaliesResponse.total > 0) {
      globalActions.push(
        `Se detectaron ${anomaliesResponse.total} anomalias. Revisar outliers de captura o eventos atipicos.`
      );
    }

    return {
      month: forecast.month,
      forecast,
      anomalyCount: anomaliesResponse.total,
      globalActions,
      advisorActions
    };
  }

  async createForecastSnapshot(actor: RequestUser, dto: QueryAiDto) {
    const scope = this.resolveScope(actor, dto);
    return this.computeForecast(actor.tenantId, scope, dto.month, true);
  }

  async persistNightlySnapshots() {
    const { rows } = await this.db.query<{ id: string }>(
      `
        SELECT id
        FROM tenants
        WHERE is_active = TRUE
          AND deleted_at IS NULL
      `
    );

    const month = new Date().toISOString().slice(0, 7);
    const persisted: Array<{ tenantId: string; month: string; forecastNominal: number }> = [];

    for (const row of rows) {
      const forecast = await this.computeForecast(
        row.id,
        {
          scopeType: 'TENANT',
          scopeId: null
        },
        month,
        true
      );

      persisted.push({
        tenantId: row.id,
        month: forecast.month,
        forecastNominal: forecast.forecastNominal
      });
    }

    return {
      persistedCount: persisted.length,
      persisted
    };
  }
}
