import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateSaasPlanDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @IsNumber()
  @Min(0)
  yearlyPrice!: number;

  @IsInt()
  @Min(1)
  maxUsers!: number;

  @IsInt()
  @Min(1)
  maxMonthlyRecords!: number;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
