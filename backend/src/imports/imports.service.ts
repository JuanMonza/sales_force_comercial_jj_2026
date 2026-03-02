import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';

type ImportRow = {
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

  private normalizeDate(value: any): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const excelEpoch = new Date(Math.round((value - 25569) * 86_400_000));
      if (!Number.isNaN(excelEpoch.getTime())) {
        return excelEpoch.toISOString().slice(0, 10);
      }
    }

    return String(value ?? '').trim();
  }

  private normalizeRow(row: Record<string, any>): ImportRow {
    return {
      advisorEmail: String(row.advisorEmail ?? row.advisor_email ?? '').trim(),
      saleAmount: String(row.saleAmount ?? row.sale_amount ?? '').trim(),
      saleDate: this.normalizeDate(row.saleDate ?? row.sale_date),
      planCode: row.planCode ?? row.plan_code ?? undefined,
      statusCode: row.statusCode ?? row.status_code ?? undefined,
      note: row.note ?? undefined
    };
  }

  private async processRows(actor: RequestUser, rows: ImportRow[]) {
    if (!rows.length) {
      throw new BadRequestException('El archivo no contiene filas');
    }

    let inserted = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        if (!row.advisorEmail || !row.saleAmount || !row.saleDate) {
          throw new Error('Campos obligatorios: advisorEmail, saleAmount, saleDate');
        }

        const parsedAmount = Number(String(row.saleAmount).replace(',', '.'));
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          throw new Error(`saleAmount invalido en fila: ${row.saleAmount}`);
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
            parsedAmount,
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

  async importSalesCsv(actor: RequestUser, buffer: Buffer) {
    const raw = buffer.toString('utf8');
    const rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, any>[];

    return this.processRows(
      actor,
      rows.map((row) => this.normalizeRow(row))
    );
  }

  async importSalesXlsx(actor: RequestUser, buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('No se encontro hoja en el archivo XLSX');
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => headers.push(String(cell.value ?? '').trim()));

    const rows: Record<string, any>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          item[header] = cell.value;
        }
      });
      rows.push(item);
    });

    return this.processRows(
      actor,
      rows.map((row) => this.normalizeRow(row))
    );
  }
}
