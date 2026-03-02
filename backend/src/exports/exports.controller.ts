import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { QueryKpiDto } from '../kpi/dto/query-kpi.dto';
import { ExportsService } from './exports.service';

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('sales.xlsx')
  @Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR)
  async exportSalesExcel(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto, @Res() res: Response) {
    const buffer = await this.exportsService.buildSalesExcel(user, dto);
    const filename = `reporte_ventas_${dto.month ?? new Date().toISOString().slice(0, 7)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('sales-report.pdf')
  @Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR)
  async exportSalesPdf(@CurrentUser() user: RequestUser, @Query() dto: QueryKpiDto, @Res() res: Response) {
    const buffer = await this.exportsService.buildSalesPdf(user, dto);
    const filename = `reporte_ventas_${dto.month ?? new Date().toISOString().slice(0, 7)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
