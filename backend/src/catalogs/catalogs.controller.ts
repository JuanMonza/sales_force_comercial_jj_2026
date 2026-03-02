import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import {
  CreateBudgetDto,
  CreatePlanDto,
  CreateRegionalDto,
  CreateServiceDto,
  CreateStatusDto,
  CreateZoneDto,
  UpdateBudgetDto,
  UpdatePlanDto,
  UpdateRegionalDto,
  UpdateServiceDto,
  UpdateStatusDto,
  UpdateZoneDto
} from './dto/catalog.dto';
import { CatalogsService } from './catalogs.service';

@Controller('catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
export class CatalogsController {
  constructor(private readonly svc: CatalogsService) {}

  /* ─── REGIONALS ──────────────────────────────────────────────────────────── */
  @Get('regionals')
  listRegionals(@CurrentUser() u: RequestUser) {
    return this.svc.listRegionals(u);
  }

  @Post('regionals')
  createRegional(@CurrentUser() u: RequestUser, @Body() dto: CreateRegionalDto) {
    return this.svc.createRegional(u, dto);
  }

  @Patch('regionals/:id')
  updateRegional(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdateRegionalDto) {
    return this.svc.updateRegional(u, id, dto);
  }

  @Delete('regionals/:id')
  deleteRegional(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.deleteRegional(u, id);
  }

  /* ─── ZONES ──────────────────────────────────────────────────────────────── */
  @Get('zones')
  listZones(@CurrentUser() u: RequestUser) {
    return this.svc.listZones(u);
  }

  @Post('zones')
  createZone(@CurrentUser() u: RequestUser, @Body() dto: CreateZoneDto) {
    return this.svc.createZone(u, dto);
  }

  @Patch('zones/:id')
  updateZone(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.svc.updateZone(u, id, dto);
  }

  @Delete('zones/:id')
  deleteZone(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.deleteZone(u, id);
  }

  /* ─── PLANS ──────────────────────────────────────────────────────────────── */
  @Get('plans')
  listPlans(@CurrentUser() u: RequestUser) {
    return this.svc.listPlans(u);
  }

  @Post('plans')
  createPlan(@CurrentUser() u: RequestUser, @Body() dto: CreatePlanDto) {
    return this.svc.createPlan(u, dto);
  }

  @Patch('plans/:id')
  updatePlan(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.svc.updatePlan(u, id, dto);
  }

  @Delete('plans/:id')
  deletePlan(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.deletePlan(u, id);
  }

  /* ─── SERVICES ───────────────────────────────────────────────────────────── */
  @Get('services')
  listServices(@CurrentUser() u: RequestUser) {
    return this.svc.listServices(u);
  }

  @Post('services')
  createService(@CurrentUser() u: RequestUser, @Body() dto: CreateServiceDto) {
    return this.svc.createService(u, dto);
  }

  @Patch('services/:id')
  updateService(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.svc.updateService(u, id, dto);
  }

  @Delete('services/:id')
  deleteService(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.deleteService(u, id);
  }

  /* ─── STATUS_CATALOG ─────────────────────────────────────────────────────── */
  @Get('statuses')
  listStatuses(@CurrentUser() u: RequestUser) {
    return this.svc.listStatuses(u);
  }

  @Post('statuses')
  createStatus(@CurrentUser() u: RequestUser, @Body() dto: CreateStatusDto) {
    return this.svc.createStatus(u, dto);
  }

  @Patch('statuses/:id')
  updateStatus(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.svc.updateStatus(u, id, dto);
  }

  @Delete('statuses/:id')
  deleteStatus(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.deleteStatus(u, id);
  }

  /* ─── BUDGETS ─────────────────────────────────────────────────────────────── */
  @Get('budgets')
  listBudgets(@CurrentUser() u: RequestUser) {
    return this.svc.listBudgets(u);
  }

  @Post('budgets')
  createBudget(@CurrentUser() u: RequestUser, @Body() dto: CreateBudgetDto) {
    return this.svc.createBudget(u, dto);
  }

  @Patch('budgets/:id')
  updateBudget(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.svc.updateBudget(u, id, dto);
  }

  @Delete('budgets/:id')
  deleteBudget(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.deleteBudget(u, id);
  }
}
