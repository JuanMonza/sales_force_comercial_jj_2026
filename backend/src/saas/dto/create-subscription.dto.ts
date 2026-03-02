import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsIn(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  status!: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

  @IsIn(['MONTHLY', 'YEARLY'])
  billingCycle!: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
