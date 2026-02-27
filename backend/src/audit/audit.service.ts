import { Injectable } from '@nestjs/common';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(actor: RequestUser, tableName?: string, limit = 100, offset = 0) {
    const params: unknown[] = [actor.tenantId];
    const filters: string[] = ['tenant_id = $1'];

    if (tableName) {
      params.push(tableName);
      filters.push(`table_name = $${params.length}`);
    }

    params.push(limit, offset);
    const limitPos = params.length - 1;
    const offsetPos = params.length;

    const { rows } = await this.db.query(
      `
        SELECT
          id,
          table_name,
          action,
          record_pk,
          old_data,
          new_data,
          created_at
        FROM audit_logs
        WHERE ${filters.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${limitPos}
        OFFSET $${offsetPos}
      `,
      params
    );

    return rows;
  }
}

