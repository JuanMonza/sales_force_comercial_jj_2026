import { IsString, MaxLength, MinLength } from 'class-validator';

export class AppsheetAdvisorParamDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  document!: string;
}
