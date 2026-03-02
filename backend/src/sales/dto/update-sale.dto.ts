import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateSaleDto {
  @IsOptional()
  @IsString()
  saleDate?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saleAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @IsOptional()
  @IsBoolean()
  isFallen?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

