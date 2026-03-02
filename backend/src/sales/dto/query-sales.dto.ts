import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QuerySalesDto {
  @IsOptional()
  @IsUUID()
  regionalId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  advisorId?: string;

  @IsOptional()
  @IsString()
  directorId?: string;

  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @IsOptional()
  @IsString()
  statusId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(2)
  quincena?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 100))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit = 100;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 0))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

