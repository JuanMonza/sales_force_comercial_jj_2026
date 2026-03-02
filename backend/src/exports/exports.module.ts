import { Module } from '@nestjs/common';
import { KpiModule } from '../kpi/kpi.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [KpiModule],
  controllers: [ExportsController],
  providers: [ExportsService]
})
export class ExportsModule {}
