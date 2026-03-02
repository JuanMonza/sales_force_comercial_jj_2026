import { IsOptional, IsString } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  dashboardTitle?: string;

  @IsOptional()
  @IsString()
  customCss?: string;
}
