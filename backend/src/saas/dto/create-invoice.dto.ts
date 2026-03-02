import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
