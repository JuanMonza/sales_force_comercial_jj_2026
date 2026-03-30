import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAppsheetSaleDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  advisorDocument!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  saleAmount!: number;

  @IsDateString()
  saleDate!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
