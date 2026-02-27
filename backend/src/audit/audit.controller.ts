import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMINISTRADOR)
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('tableName') tableName?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.auditService.findAll(user, tableName, Number(limit ?? 100), Number(offset ?? 0));
  }
}

