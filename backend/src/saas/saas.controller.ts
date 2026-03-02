import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateSaasPlanDto } from './dto/create-saas-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateSaasPlanDto } from './dto/update-saas-plan.dto';
import { SaasService } from './saas.service';

@Controller('saas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  @Get('plans')
  getPlans() {
    return this.saasService.getPlans();
  }

  @Post('plans')
  createPlan(@Body() dto: CreateSaasPlanDto) {
    return this.saasService.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSaasPlanDto) {
    return this.saasService.updatePlan(id, dto);
  }

  @Get('subscriptions')
  getSubscriptions(@CurrentUser() user: RequestUser) {
    return this.saasService.getSubscriptions(user);
  }

  @Post('subscriptions')
  createSubscription(@CurrentUser() user: RequestUser, @Body() dto: CreateSubscriptionDto) {
    return this.saasService.createSubscription(user, dto);
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: RequestUser) {
    return this.saasService.getInvoices(user);
  }

  @Post('invoices')
  createInvoice(@CurrentUser() user: RequestUser, @Body() dto: CreateInvoiceDto) {
    return this.saasService.createInvoice(user, dto);
  }

  @Get('branding')
  @Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR, Role.ASESOR)
  getBranding(@CurrentUser() user: RequestUser) {
    return this.saasService.getBranding(user);
  }

  @Patch('branding')
  updateBranding(@CurrentUser() user: RequestUser, @Body() dto: UpdateBrandingDto) {
    return this.saasService.updateBranding(user, dto);
  }

  @Get('customer-profile')
  getCustomerProfile(@CurrentUser() user: RequestUser) {
    return this.saasService.getCustomerProfile(user);
  }
}
