import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSaleServiceItemDto {
  @IsUUID()
  serviceId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  nominalAmount!: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID()
  advisorId?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsNumber()
  @Min(0)
  saleAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @IsOptional()
  @IsBoolean()
  isFallen?: boolean;

  @IsDateString()
  saleDate!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleServiceItemDto)
  services?: CreateSaleServiceItemDto[];
}

