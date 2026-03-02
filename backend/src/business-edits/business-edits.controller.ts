import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { BusinessEditsService } from './business-edits.service';
import { QueryRecordVersionsDto } from './dto/query-record-versions.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('business-edits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
export class BusinessEditsController {
  constructor(private readonly businessEditsService: BusinessEditsService) {}

  @Patch('budgets/:id')
  updateBudget(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.businessEditsService.updateBudget(user, id, dto);
  }

  @Get('record-versions')
  getRecordVersions(@CurrentUser() user: RequestUser, @Query() dto: QueryRecordVersionsDto) {
    return this.businessEditsService.getRecordVersions(user, dto);
  }
}
