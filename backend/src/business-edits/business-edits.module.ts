import { Module } from '@nestjs/common';
import { BusinessEditsController } from './business-edits.controller';
import { BusinessEditsService } from './business-edits.service';

@Module({
  controllers: [BusinessEditsController],
  providers: [BusinessEditsService]
})
export class BusinessEditsModule {}
