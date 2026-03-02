import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module';
import { AppsheetModule } from './appsheet/appsheet.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { ExportsModule } from './exports/exports.module';
import { HealthController } from './health/health.controller';
import { ImportsModule } from './imports/imports.module';
import { JobsModule } from './jobs/jobs.module';
import { KpiModule } from './kpi/kpi.module';
import { ObservabilityModule } from './observability/observability.module';
import { SaasModule } from './saas/saas.module';
import { SalesModule } from './sales/sales.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { BusinessEditsModule } from './business-edits/business-edits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 240
      }
    ]),
    DatabaseModule,
    CacheModule,
    AuthModule,
    UsersModule,
    SalesModule,
    KpiModule,
    ImportsModule,
    ExportsModule,
    AiModule,
    SaasModule,
    JobsModule,
    AuditModule,
    ObservabilityModule,
    BusinessEditsModule,
    CatalogsModule,
    AppsheetModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
