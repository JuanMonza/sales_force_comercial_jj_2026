import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { QueryAiDto } from './dto/query-ai.dto';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR, Role.ASESOR)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('forecast')
  getForecast(@CurrentUser() user: RequestUser, @Query() dto: QueryAiDto) {
    return this.aiService.getForecast(user, dto);
  }

  @Get('anomalies')
  getAnomalies(@CurrentUser() user: RequestUser, @Query() dto: QueryAiDto) {
    return this.aiService.getAnomalies(user, dto);
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: RequestUser, @Query() dto: QueryAiDto) {
    return this.aiService.getRecommendations(user, dto);
  }

  @Post('forecast/snapshot')
  @Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR)
  createSnapshot(@CurrentUser() user: RequestUser, @Query() dto: QueryAiDto) {
    return this.aiService.createForecastSnapshot(user, dto);
  }
}
