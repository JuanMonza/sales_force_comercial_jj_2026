import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/* ─── REGIONALS ─────────────────────────────────────────────────────────────── */
export class CreateRegionalDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
}
export class UpdateRegionalDto {
  @IsString() @IsOptional() code?: string;
  @IsString() @IsOptional() name?: string;
}

/* ─── ZONES ─────────────────────────────────────────────────────────────────── */
export class CreateZoneDto {
  @IsUUID() @IsNotEmpty() regional_id!: string;
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
}
export class UpdateZoneDto {
  @IsUUID() @IsOptional() regional_id?: string;
  @IsString() @IsOptional() code?: string;
  @IsString() @IsOptional() name?: string;
}

/* ─── PLANS ─────────────────────────────────────────────────────────────────── */
export class CreatePlanDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsNumber() @Min(0) base_price!: number;
  @IsBoolean() @IsOptional() is_active?: boolean;
}
export class UpdatePlanDto {
  @IsString() @IsOptional() code?: string;
  @IsString() @IsOptional() name?: string;
  @IsNumber() @IsOptional() @Min(0) base_price?: number;
  @IsBoolean() @IsOptional() is_active?: boolean;
}

/* ─── SERVICES ───────────────────────────────────────────────────────────────── */
export class CreateServiceDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsNumber() @Min(0) price!: number;
  @IsBoolean() @IsOptional() is_active?: boolean;
}
export class UpdateServiceDto {
  @IsString() @IsOptional() code?: string;
  @IsString() @IsOptional() name?: string;
  @IsNumber() @IsOptional() @Min(0) price?: number;
  @IsBoolean() @IsOptional() is_active?: boolean;
}

/* ─── STATUS_CATALOG ─────────────────────────────────────────────────────────── */
export class CreateStatusDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsBoolean() @IsOptional() is_final?: boolean;
  @IsBoolean() @IsOptional() is_approved?: boolean;
  @IsBoolean() @IsOptional() is_active?: boolean;
}
export class UpdateStatusDto {
  @IsString() @IsOptional() code?: string;
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() is_final?: boolean;
  @IsBoolean() @IsOptional() is_approved?: boolean;
  @IsBoolean() @IsOptional() is_active?: boolean;
}

/* ─── BUDGETS ─────────────────────────────────────────────────────────────────── */
export class CreateBudgetDto {
  @IsDateString() month_date!: string;                      // YYYY-MM-01
  @IsIn(['TENANT', 'REGIONAL', 'ZONE', 'ADVISOR']) scope_type!: string;
  @IsUUID() @IsOptional() scope_id?: string;
  @IsNumber() @Min(0) target_amount!: number;
  @IsNumber() @Min(0) @IsOptional() target_count?: number;
  @IsNumber() @Min(0) @IsOptional() target_120_amount?: number;
  @IsNumber() @Min(0) @IsOptional() approved_target_amount?: number;
}
export class UpdateBudgetDto {
  @IsNumber() @IsOptional() @Min(0) target_amount?: number;
  @IsNumber() @IsOptional() @Min(0) target_count?: number;
  @IsNumber() @IsOptional() @Min(0) target_120_amount?: number;
  @IsNumber() @IsOptional() @Min(0) approved_target_amount?: number;
}
