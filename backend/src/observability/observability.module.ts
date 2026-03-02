import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics.interceptor';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';

@Module({
  controllers: [ObservabilityController],
  providers: [
    ObservabilityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor
    }
  ],
  exports: [ObservabilityService]
})
export class ObservabilityModule {}
