import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';

type CsvRow = {
  advisorEmail: string;
  saleAmount: string;
  saleDate: string;
  planCode?: string;
  statusCode?: string;
  note?: string;
};

@Injectable()
export class ImportsService {
  constructor(private readonly db: DatabaseService) {}

  async importSalesCsv(actor: RequestUser, buffer: Buffer) {
    const raw = buffer.toString('utf8');
    const rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CsvRow[];

    if (!rows.length) {
      throw new BadRequestException('El archivo CSV no contiene filas');
    }

    let inserted = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        if (!row.advisorEmail || !row.saleAmount || !row.saleDate) {
          throw new Error('Campos obligatorios: advisorEmail, saleAmount, saleDate');
        }

        const advisorQuery = await this.db.query<{
          advisor_id: string;
          zone_id: string;
          regional_id: string;
        }>(
          `
          SELECT
            u.id AS advisor_id,
            ap.zone_id,
            z.regional_id
          FROM users u
          JOIN advisor_profiles ap ON ap.user_id = u.id
          JOIN zones z ON z.id = ap.zone_id
          WHERE u.tenant_id = $1
            AND lower(u.email) = lower($2)
            AND u.deleted_at IS NULL
          LIMIT 1
          `,
          [actor.tenantId, row.advisorEmail]
        );

        const advisor = advisorQuery.rows[0];
        if (!advisor) {
          throw new Error(`Asesor no encontrado: ${row.advisorEmail}`);
        }

        const planId = row.planCode
          ? (
              await this.db.query<{ id: string }>(
                `
                  SELECT id
                  FROM plans
                  WHERE tenant_id = $1
                    AND code = $2
                    AND deleted_at IS NULL
                  LIMIT 1
                `,
                [actor.tenantId, row.planCode]
              )
            ).rows[0]?.id ?? null
          : null;

        const statusId = row.statusCode
          ? (
              await this.db.query<{ id: string }>(
                `
                  SELECT id
                  FROM status_catalog
                  WHERE tenant_id = $1
                    AND code = $2
                    AND deleted_at IS NULL
                  LIMIT 1
                `,
                [actor.tenantId, row.statusCode]
              )
            ).rows[0]?.id ?? null
          : null;

        await this.db.query(
          `
          INSERT INTO sales (
            tenant_id, advisor_id, regional_id, zone_id, plan_id, status_id,
            sale_amount, approved_amount, is_fallen, sale_date, note, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, FALSE, $8::date, $9, $10, $10)
          `,
          [
            actor.tenantId,
            advisor.advisor_id,
            advisor.regional_id,
            advisor.zone_id,
            planId,
            statusId,
            Number(row.saleAmount),
            row.saleDate,
            row.note ?? null,
            actor.userId
          ]
        );

        inserted += 1;
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message
        });
      }
    }

    return {
      inserted,
      failed: errors.length,
      errors
    };
  }
}

