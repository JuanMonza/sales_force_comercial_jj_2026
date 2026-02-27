import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { ImportsModule } from './imports/imports.module';
import { KpiModule } from './kpi/kpi.module';
import { SalesModule } from './sales/sales.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    CacheModule,
    AuthModule,
    UsersModule,
    SalesModule,
    KpiModule,
    ImportsModule,
    AuditModule
  ],
  controllers: [HealthController]
})
export class AppModule {}

