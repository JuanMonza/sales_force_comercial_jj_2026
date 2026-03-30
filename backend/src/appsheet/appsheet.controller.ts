import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppsheetService } from './appsheet.service';
import { AppsheetAdvisorParamDto } from './dto/appsheet-advisor-param.dto';
import { CreateAppsheetSaleDto } from './dto/create-appsheet-sale.dto';
import { QueryAppsheetSalesDto } from './dto/query-appsheet-sales.dto';

const DEFAULT_TENANT = () => process.env['DEFAULT_TENANT_ID'] ?? '00000000-0000-0000-0000-000000000001';

@Controller('appsheet')
export class AppsheetController {
  constructor(
    private readonly appsheetService: AppsheetService,
    private readonly config: ConfigService
  ) {}

  /** Verificar que el API key funciona (AppSheet usa esto como health check) */
  @Get('ping')
  ping(
    @Headers('x-api-key') headerApiKey?: string,
    @Query('apiKey') queryApiKey?: string
  ) {
    this.appsheetService.validateApiKey(headerApiKey, queryApiKey);
    return { ok: true, message: 'Conexion exitosa con Sales Force Comercial' };
  }

  /**
   * Validar un asesor por cedula y obtener su info + catalogos.
   * AppSheet puede llamar esto al iniciar la app para identificar al usuario.
   * GET /appsheet/advisor/:document
   * Header: x-api-key: XXX
   */
  @Get('advisor/:document')
  async getAdvisor(
    @Param() params: AppsheetAdvisorParamDto,
    @Headers('x-api-key') headerApiKey?: string,
    @Query('apiKey') queryApiKey?: string
  ) {
    this.appsheetService.validateApiKey(headerApiKey, queryApiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    const advisor = await this.appsheetService.getAdvisorByDocument(params.document, tenantId);
    const catalogs = await this.appsheetService.getCatalogs(tenantId);
    return { advisor, catalogs };
  }

  /**
   * Catalogos disponibles (planes, estados, servicios).
   * AppSheet carga esto una vez para poblar los dropdowns del formulario.
   * GET /appsheet/catalogs
   * Header: x-api-key: XXX
   */
  @Get('catalogs')
  async getCatalogs(
    @Headers('x-api-key') headerApiKey?: string,
    @Query('apiKey') queryApiKey?: string
  ) {
    this.appsheetService.validateApiKey(headerApiKey, queryApiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    return this.appsheetService.getCatalogs(tenantId);
  }

  /**
   * Ventas recientes del asesor (por cedula).
   * GET /appsheet/sales?advisorDocument=12345678&limit=30
   * Header: x-api-key: XXX
   */
  @Get('sales')
  async getSales(
    @Query() query: QueryAppsheetSalesDto,
    @Headers('x-api-key') headerApiKey?: string,
    @Query('apiKey') queryApiKey?: string
  ) {
    this.appsheetService.validateApiKey(headerApiKey, queryApiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    const advisor = await this.appsheetService.getAdvisorByDocument(query.advisorDocument, tenantId);
    const sales = await this.appsheetService.getAdvisorSales(advisor.user_id, tenantId, query.limit);
    return {
      advisor: { fullName: advisor.full_name, document: advisor.document_id, category: advisor.category },
      sales
    };
  }

  /**
   * Registrar una nueva venta desde AppSheet.
   * POST /appsheet/sales
   * Header: x-api-key: XXX
   * Header: x-idempotency-key: <id-unico-por-venta>
   * Body: { advisorDocument, saleAmount, saleDate, planId?, statusId?, note? }
   */
  @Post('sales')
  async createSale(
    @Body() body: CreateAppsheetSaleDto,
    @Headers('x-api-key') headerApiKey?: string,
    @Headers('x-idempotency-key') idempotencyKey?: string,
    @Query('apiKey') queryApiKey?: string
  ) {
    this.appsheetService.validateApiKey(headerApiKey, queryApiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    const advisor = await this.appsheetService.getAdvisorByDocument(body.advisorDocument, tenantId);
    return this.appsheetService.createSale(
      advisor.user_id,
      advisor.zone_id,
      advisor.regional_id,
      tenantId,
      body,
      idempotencyKey
    );
  }
}
