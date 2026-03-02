import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { QueryKpiDto } from './dto/query-kpi.dto';
import { KpiService } from './kpi.service';

@Controller('kpis')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR, Role.ASESOR)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getSalesSummary(user, dto);
  }

  @Get('sales-report-comparative')
  getSalesReportComparative(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getSalesReportComparative(user, dto);
  }

  @Get('advisor-compliance/current')
  getAdvisorComplianceCurrent(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getAdvisorCompliance(user, dto, false);
  }

  @Get('advisor-compliance/previous')
  getAdvisorCompliancePrevious(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getAdvisorCompliance(user, dto, true);
  }

  @Get('regional-progress/current')
  getRegionalProgressCurrent(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getRegionalProgress(user, dto, false);
  }

  @Get('regional-progress/previous')
  getRegionalProgressPrevious(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getRegionalProgress(user, dto, true);
  }

  @Get('daily-sales')
  getDailySales(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto) {
    return this.kpiService.getDailySales(user, dto);
  }

  @Get('reporting-tracking')
  getReportingTracking(@CurrentUser() user: RequestUser) {
    return this.kpiService.getReportingTracking(user);
  }
}
