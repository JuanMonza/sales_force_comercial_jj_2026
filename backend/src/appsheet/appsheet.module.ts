import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../cache/cache.module';
import { DatabaseModule } from '../database/database.module';
import { AppsheetController } from './appsheet.controller';
import { AppsheetService } from './appsheet.service';

@Module({
  imports: [DatabaseModule, ConfigModule, CacheModule],
  controllers: [AppsheetController],
  providers: [AppsheetService]
})
export class AppsheetModule {}
