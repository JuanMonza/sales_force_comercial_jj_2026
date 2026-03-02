import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppsheetService } from './appsheet.service';

const DEFAULT_TENANT = () => process.env['DEFAULT_TENANT_ID'] ?? '00000000-0000-0000-0000-000000000001';

@Controller('appsheet')
export class AppsheetController {
  constructor(
    private readonly appsheetService: AppsheetService,
    private readonly config: ConfigService
  ) {}

  /** Verificar que el API key funciona (AppSheet usa esto como health check) */
  @Get('ping')
  ping(@Query('apiKey') apiKey: string) {
    this.appsheetService.validateApiKey(apiKey);
    return { ok: true, message: 'Conexion exitosa con Sales Force Comercial' };
  }

  /**
   * Validar un asesor por cedula y obtener su info + catalogos.
   * AppSheet puede llamar esto al iniciar la app para identificar al usuario.
   * GET /appsheet/advisor/:document?apiKey=XXX
   */
  @Get('advisor/:document')
  async getAdvisor(
    @Param('document') document: string,
    @Query('apiKey') apiKey: string
  ) {
    this.appsheetService.validateApiKey(apiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    const advisor = await this.appsheetService.getAdvisorByDocument(document, tenantId);
    const catalogs = await this.appsheetService.getCatalogs(tenantId);
    return { advisor, catalogs };
  }

  /**
   * Catalogos disponibles (planes, estados, servicios).
   * AppSheet carga esto una vez para poblar los dropdowns del formulario.
   * GET /appsheet/catalogs?apiKey=XXX
   */
  @Get('catalogs')
  async getCatalogs(@Query('apiKey') apiKey: string) {
    this.appsheetService.validateApiKey(apiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    return this.appsheetService.getCatalogs(tenantId);
  }

  /**
   * Ventas recientes del asesor (por cedula).
   * GET /appsheet/sales?apiKey=XXX&advisorDocument=12345678&limit=30
   */
  @Get('sales')
  async getSales(
    @Query('apiKey') apiKey: string,
    @Query('advisorDocument') advisorDocument: string,
    @Query('limit') limit?: string
  ) {
    this.appsheetService.validateApiKey(apiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    const advisor = await this.appsheetService.getAdvisorByDocument(advisorDocument, tenantId);
    const sales = await this.appsheetService.getAdvisorSales(advisor.user_id, tenantId, limit ? Number(limit) : 50);
    return {
      advisor: { fullName: advisor.full_name, document: advisor.document_id, category: advisor.category },
      sales
    };
  }

  /**
   * Registrar una nueva venta desde AppSheet.
   * POST /appsheet/sales?apiKey=XXX
   * Body: { advisorDocument, saleAmount, saleDate, planId?, statusId?, note? }
   */
  @Post('sales')
  async createSale(
    @Query('apiKey') apiKey: string,
    @Body() body: {
      advisorDocument: string;
      saleAmount: number;
      saleDate: string;
      planId?: string;
      statusId?: string;
      note?: string;
    }
  ) {
    this.appsheetService.validateApiKey(apiKey);
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID') ?? DEFAULT_TENANT();
    const advisor = await this.appsheetService.getAdvisorByDocument(body.advisorDocument, tenantId);
    return this.appsheetService.createSale(
      advisor.user_id,
      advisor.zone_id,
      advisor.regional_id,
      tenantId,
      body
    );
  }
}
