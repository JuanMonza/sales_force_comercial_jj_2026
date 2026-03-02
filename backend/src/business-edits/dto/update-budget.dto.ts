import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  target120Amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedTargetAmount?: number;

  @IsOptional()
  @IsString()
  changeReason?: string;
}
