import { Injectable } from '@nestjs/common';
import type * as ExcelJSTypes from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require('exceljs') as typeof ExcelJSTypes;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { RequestUser } from '../common/interfaces/request-user.interface';
import { KpiService } from '../kpi/kpi.service';
import { QueryKpiDto } from '../kpi/dto/query-kpi.dto';

@Injectable()
export class ExportsService {
  constructor(private readonly kpiService: KpiService) {}

  private toMoney(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  private toPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    return `${Number(value).toFixed(2)}%`;
  }

  private addJsonRowsSheet(workbook: ExcelJSTypes.Workbook, title: string, rows: Record<string, unknown>[]) {
    const sheet = workbook.addWorksheet(title);
    if (!rows.length) {
      sheet.addRow(['Sin datos']);
      return;
    }

    const columns = Object.keys(rows[0]).map((key) => ({
      key,
      header: key
    }));

    sheet.columns = columns;
    rows.forEach((row) => {
      sheet.addRow(row);
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  async buildSalesExcel(actor: RequestUser, dto: QueryKpiDto): Promise<Buffer> {
    const [comparative, complianceCurrent, compliancePrevious, regionalCurrent, regionalPrevious, dailySales, tracking] =
      await Promise.all([
        this.kpiService.getSalesReportComparative(actor, dto),
        this.kpiService.getAdvisorCompliance(actor, dto, false),
        this.kpiService.getAdvisorCompliance(actor, dto, true),
        this.kpiService.getRegionalProgress(actor, dto, false),
        this.kpiService.getRegionalProgress(actor, dto, true),
        this.kpiService.getDailySales(actor, dto),
        this.kpiService.getReportingTracking(actor)
      ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sales Force Comercial';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.columns = [
      { header: 'Indicador', key: 'indicator', width: 42 },
      { header: 'Valor', key: 'value', width: 24 }
    ];
    summarySheet.addRows([
      { indicator: 'Mes base', value: comparative.month },
      {
        indicator: 'Total ventas mes actual',
        value: Number(comparative.mesActual.resumen.total_ventas_reportadas ?? 0)
      },
      {
        indicator: 'Nominal mes actual',
        value: this.toMoney(comparative.mesActual.resumen.nominal_reportado)
      },
      {
        indicator: 'Total ventas mes anterior',
        value: Number(comparative.mesAnterior.resumen.total_ventas_reportadas ?? 0)
      },
      {
        indicator: 'Nominal mes anterior',
        value: this.toMoney(comparative.mesAnterior.resumen.nominal_reportado)
      },
      {
        indicator: 'Variacion nominal',
        value: this.toMoney(comparative.comparativo.nominalVariation)
      },
      {
        indicator: 'Variacion nominal %',
        value: this.toPercent(comparative.comparativo.nominalVariationPct)
      },
      {
        indicator: 'Variacion total ventas',
        value: Number(comparative.comparativo.totalSalesVariation)
      },
      { indicator: 'Reportado en el mes', value: Number(tracking.reportado_mes ?? 0) },
      { indicator: 'Reportado semana pasada', value: Number(tracking.reportado_semana_pasada ?? 0) },
      { indicator: 'Reportado esta semana', value: Number(tracking.reportado_esta_semana ?? 0) },
      { indicator: 'Reportado hoy', value: Number(tracking.reportado_hoy ?? 0) }
    ]);
    summarySheet.getRow(1).font = { bold: true };

    this.addJsonRowsSheet(workbook, 'Cumplimiento Actual', complianceCurrent as Record<string, unknown>[]);
    this.addJsonRowsSheet(workbook, 'Cumplimiento Anterior', compliancePrevious as Record<string, unknown>[]);
    this.addJsonRowsSheet(workbook, 'Regional Actual', regionalCurrent as Record<string, unknown>[]);
    this.addJsonRowsSheet(workbook, 'Regional Anterior', regionalPrevious as Record<string, unknown>[]);
    this.addJsonRowsSheet(workbook, 'Ventas Por Dia', dailySales as Record<string, unknown>[]);

    const out = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(out) ? out : Buffer.from(out);
  }

  async buildSalesPdf(actor: RequestUser, dto: QueryKpiDto): Promise<Buffer> {
    const [comparative, complianceCurrent, regionalCurrent, tracking] = await Promise.all([
      this.kpiService.getSalesReportComparative(actor, dto),
      this.kpiService.getAdvisorCompliance(actor, dto, false),
      this.kpiService.getRegionalProgress(actor, dto, false),
      this.kpiService.getReportingTracking(actor)
    ]);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40
    });
    const chunks: Buffer[] = [];
    const result = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(17).text('Reporte Empresarial de Ventas', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Mes base: ${comparative.month}`);
    doc.text(`Fecha de emision: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fontSize(12).text('Resumen comparativo');
    doc.fontSize(10);
    doc.text(`Total ventas mes actual: ${Number(comparative.mesActual.resumen.total_ventas_reportadas ?? 0)}`);
    doc.text(`Nominal mes actual: ${this.toMoney(comparative.mesActual.resumen.nominal_reportado).toLocaleString('es-CO')}`);
    doc.text(
      `Total ventas mes anterior: ${Number(comparative.mesAnterior.resumen.total_ventas_reportadas ?? 0)}`
    );
    doc.text(
      `Nominal mes anterior: ${this.toMoney(comparative.mesAnterior.resumen.nominal_reportado).toLocaleString('es-CO')}`
    );
    doc.text(`Variacion nominal: ${this.toMoney(comparative.comparativo.nominalVariation).toLocaleString('es-CO')}`);
    doc.text(`Variacion nominal %: ${this.toPercent(comparative.comparativo.nominalVariationPct)}`);
    doc.moveDown();

    doc.fontSize(12).text('Seguimiento de reportes');
    doc.fontSize(10);
    doc.text(`Reportado en el mes: ${tracking.reportado_mes}`);
    doc.text(`Reportado semana pasada: ${tracking.reportado_semana_pasada}`);
    doc.text(`Reportado esta semana: ${tracking.reportado_esta_semana}`);
    doc.text(`Reportado hoy: ${tracking.reportado_hoy}`);
    doc.moveDown();

    doc.fontSize(12).text('Top asesores en riesgo (cumplimiento mas bajo)');
    doc.fontSize(10);
    complianceCurrent
      .slice()
      .sort((a, b) => Number(a.porcentajeCumplimiento) - Number(b.porcentajeCumplimiento))
      .slice(0, 10)
      .forEach((item, index) => {
        doc.text(
          `${index + 1}. ${item.nombreAsesor} | ${item.zona} | ${item.porcentajeCumplimiento.toFixed(2)}% | Falta ${this.toMoney(
            item.nosFalta
          ).toLocaleString('es-CO')}`
        );
      });
    doc.moveDown();

    doc.fontSize(12).text('Avance regional actual');
    doc.fontSize(10);
    regionalCurrent.slice(0, 10).forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.regional} | Cumplimiento 100%: ${item.porcentajeCumplimiento100.toFixed(2)}% | Proyeccion: ${this.toMoney(
          item.proyeccionCierre
        ).toLocaleString('es-CO')}`
      );
    });

    doc.end();
    return result;
  }
}
