import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryAiDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsIn(['TENANT', 'REGIONAL', 'ZONE', 'ADVISOR'])
  scopeType?: 'TENANT' | 'REGIONAL' | 'ZONE' | 'ADVISOR';

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(300)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0.5)
  @Max(6)
  zScoreThreshold?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    return value === true || value === 'true' || value === '1';
  })
  @IsBoolean()
  persist?: boolean;
}
