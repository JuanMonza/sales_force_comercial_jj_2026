import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryRecordVersionsDto {
  @IsIn(['sales', 'users', 'budgets'])
  entityName!: 'sales' | 'users' | 'budgets';

  @IsUUID()
  recordId!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
