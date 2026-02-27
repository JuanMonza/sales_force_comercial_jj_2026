import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { DATABASE_POOL } from './database.constants';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
