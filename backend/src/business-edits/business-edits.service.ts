import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';
import { QueryRecordVersionsDto } from './dto/query-record-versions.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

type BudgetRow = {
  id: string;
  tenant_id: string;
  month_date: string;
  scope_type: string;
  scope_id: string | null;
  target_amount: string;
  target_count: number;
  target_120_amount: string;
  approved_target_amount: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class BusinessEditsService {
  constructor(private readonly db: DatabaseService) {}

  private async getBudget(actor: RequestUser, id: string): Promise<BudgetRow> {
    const { rows } = await this.db.query<BudgetRow>(
      `
        SELECT
          id,
          tenant_id,
          month_date,
          scope_type,
          scope_id,
          target_amount,
          target_count,
          target_120_amount,
          approved_target_amount,
          created_by,
          created_at,
          updated_at
        FROM budgets
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [actor.tenantId, id]
    );

    if (!rows[0]) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return rows[0];
  }

  async updateBudget(actor: RequestUser, id: string, dto: UpdateBudgetDto) {
    const previous = await this.getBudget(actor, id);

    await this.db.query(
      `
        UPDATE budgets
        SET
          target_amount = COALESCE($3, target_amount),
          target_count = COALESCE($4, target_count),
          target_120_amount = COALESCE($5, target_120_amount),
          approved_target_amount = COALESCE($6, approved_target_amount),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
      `,
      [
        actor.tenantId,
        id,
        dto.targetAmount ?? null,
        dto.targetCount ?? null,
        dto.target120Amount ?? null,
        dto.approvedTargetAmount ?? null
      ]
    );

    const updated = await this.getBudget(actor, id);
    const versionResult = await this.db.query<{ next_version: number }>(
      `
        SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
        FROM record_versions
        WHERE tenant_id = $1
          AND entity_name = 'budgets'
          AND record_id = $2
      `,
      [actor.tenantId, id]
    );
    const versionNo = versionResult.rows[0]?.next_version ?? 1;

    await this.db.query(
      `
        INSERT INTO record_versions (
          tenant_id, entity_name, record_id, version_no, changed_by, change_reason, old_data, new_data
        ) VALUES ($1, 'budgets', $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      `,
      [
        actor.tenantId,
        id,
        versionNo,
        actor.userId,
        dto.changeReason ?? 'Edicion global segura de presupuesto',
        JSON.stringify(previous),
        JSON.stringify(updated)
      ]
    );

    return {
      updated: true,
      budgetId: id,
      versionNo,
      budget: updated
    };
  }

  async getRecordVersions(actor: RequestUser, dto: QueryRecordVersionsDto) {
    const { rows } = await this.db.query(
      `
        SELECT
          entity_name,
          record_id,
          version_no,
          changed_by,
          change_reason,
          old_data,
          new_data,
          created_at
        FROM record_versions
        WHERE tenant_id = $1
          AND entity_name = $2
          AND record_id = $3::uuid
        ORDER BY version_no DESC
        LIMIT $4::int
      `,
      [actor.tenantId, dto.entityName, dto.recordId, dto.limit ?? 100]
    );
    return rows;
  }
}
