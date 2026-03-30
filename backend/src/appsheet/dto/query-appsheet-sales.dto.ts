import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class QueryAppsheetSalesDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  advisorDocument!: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 50))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;
}
