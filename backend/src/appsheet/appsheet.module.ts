import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AppsheetController } from './appsheet.controller';
import { AppsheetService } from './appsheet.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [AppsheetController],
  providers: [AppsheetService]
})
export class AppsheetModule {}
