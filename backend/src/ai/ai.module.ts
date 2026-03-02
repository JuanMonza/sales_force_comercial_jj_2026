import { Module } from '@nestjs/common';
import { KpiModule } from '../kpi/kpi.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [KpiModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
