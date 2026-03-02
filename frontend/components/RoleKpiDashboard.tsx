
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { KpiCard } from './KpiCard';

type CatalogItem = {
  id: string;
  name: string;
  code?: string;
};

type CatalogsResponse = {
  regionals: CatalogItem[];
  zones: CatalogItem[];
  directors: CatalogItem[];
  coordinators: CatalogItem[];
  advisors: CatalogItem[];
  plans: CatalogItem[];
  statuses: CatalogItem[];
  services: CatalogItem[];
};

type SalesReportPeriod = {
  resumen: {
    total_ventas_reportadas: number;
    nominal_reportado: string | number;
  };
  quincena: Array<{
    quincena: number;
    cantidad_ventas: number;
    nominal: string | number;
  }>;
  plan: Array<{
    plan: string;
    cantidad_ventas: number;
    nominal: string | number;
  }>;
  status: Array<{
    status: string;
    cantidad_ventas: number;
    nominal: string | number;
  }>;
  servicios: Array<{
    servicio: string;
    cantidad_ventas: number;
    nominal: string | number;
  }>;
  tendencia: Array<{
    sale_date: string;
    cantidad_ventas: number;
    nominal: string | number;
  }>;
  picosActividad: Array<{
    sale_date: string;
    cantidad_ventas: number;
    nominal: string | number;
  }>;
};

type SalesReportComparativeResponse = {
  month: string;
  comparativo: {
    nominalVariation: number;
    nominalVariationPct: number | null;
    totalSalesVariation: number;
  };
  mesActual: SalesReportPeriod;
  mesAnterior: SalesReportPeriod;
};

type ReportingTracking = {
  reportado_mes: number;
  reportado_semana_pasada: number;
  reportado_esta_semana: number;
  reportado_hoy: number;
};

type AdvisorComplianceRow = {
  director: string;
  regional: string;
  zona: string;
  cedulaAsesor: string;
  nombreAsesor: string;
  categoria: string;
  presupuesto: number;
  llevamos: number;
  cantidadVentas: number;
  nosFalta: number;
  debemosHacerDiario: number | null;
  porcentajeCumplimiento: number;
  proyeccionCierre: number;
  porcentajeProyeccion: number;
  fechaRegistro: string;
  mesRegistro: string;
};

type RegionalProgressRow = {
  regional: string;
  presupuesto100: number;
  llevamos: number;
  porcentajeCumplimiento100: number;
  falta: number;
  metaDiariaRequerida: number | null;
  presupuesto120: number;
  porcentajeCumplimiento120: number;
  proyeccionCierre: number;
  aprobado?: number;
  porcentajeCumplimientoAprobado?: number;
  porcentajeAprobadoVsCantado?: number;
  porcentajeCaidasVsCantadas?: number;
};

type DailySalesRow = {
  regional: string;
  zona: string;
  cedula_asesor: string;
  nombre_asesor: string;
  fecha_diligenciamiento: string;
  cantidad_ventas: number;
  nominal: string | number;
};

type DashboardFilters = {
  regionalId: string;
  zoneId: string;
  directorId: string;
  coordinatorId: string;
  advisorId: string;
  statusId: string;
  quincena: string;
  planId: string;
  serviceId: string;
  startDate: string;
  endDate: string;
};

const initialFilters: DashboardFilters = {
  regionalId: '',
  zoneId: '',
  directorId: '',
  coordinatorId: '',
  advisorId: '',
  statusId: '',
  quincena: '',
  planId: '',
  serviceId: '',
  startDate: '',
  endDate: ''
};

const PIE_COLORS = ['#23c7d9', '#6ef2c8', '#ffb142', '#ff6b81', '#748ffc', '#80ed99'];

function money(v: number | string | null | undefined) {
  return `$${Number(v ?? 0).toLocaleString('es-CO')}`;
}

function pct(v: number | null | undefined) {
  if (v === null || v === undefined) return '-';
  return `${Number(v).toFixed(2)}%`;
}

/** Semáforo: devuelve clases Tailwind según % de cumplimiento */
function semaphoreClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'text-slate-400';
  if (v >= 100) return 'font-bold text-cyan-400';     // Sobre-cumplimiento
  if (v >= 80)  return 'font-bold text-green-400';   // Cumplido
  if (v >= 60)  return 'font-bold text-yellow-400';  // Medio
  if (v >= 40)  return 'font-bold text-orange-400';  // Bajo
  return 'font-bold text-rose-400';                   // Critico
}

/** Indicador del semáforo */
function semaphoreEmoji(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-';
  if (v >= 100) return '[MAX]';
  if (v >= 80)  return '[OK]';
  if (v >= 60)  return '[MED]';
  if (v >= 40)  return '[BAJ]';
  return '[CRIT]';
}

function buildQuery(filters: DashboardFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

function asDay(dateIso: string) {
  return Number(dateIso.slice(-2));
}

export function RoleKpiDashboard({ role }: { role: 'DIRECTOR' | 'COORDINADOR' }) {
  const [catalogs, setCatalogs] = useState<CatalogsResponse | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [report, setReport] = useState<SalesReportComparativeResponse | null>(null);
  const [complianceCurrent, setComplianceCurrent] = useState<AdvisorComplianceRow[]>([]);
  const [compliancePrevious, setCompliancePrevious] = useState<AdvisorComplianceRow[]>([]);
  const [regionalCurrent, setRegionalCurrent] = useState<RegionalProgressRow[]>([]);
  const [regionalPrevious, setRegionalPrevious] = useState<RegionalProgressRow[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesRow[]>([]);
  const [tracking, setTracking] = useState<ReportingTracking | null>(null);
  const [advisorNameFilter, setAdvisorNameFilter] = useState('');
  const [complianceCurrPage, setComplianceCurrPage] = useState(1);
  const [compliancePrevPage, setCompliancePrevPage] = useState(1);
  const COMP_PAGE_SIZE = 20;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async (activeFilters: DashboardFilters) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    const query = buildQuery(activeFilters);
    const suffix = query ? `?${query}` : '';

    try {
      const [
        catalogsRes,
        reportRes,
        complianceCurrentRes,
        compliancePreviousRes,
        regionalCurrentRes,
        regionalPreviousRes,
        dailySalesRes,
        trackingRes
      ] = await Promise.all([
        apiFetch<CatalogsResponse>('/sales/catalogs', { token }),
        apiFetch<SalesReportComparativeResponse>(`/kpis/sales-report-comparative${suffix}`, { token }),
        apiFetch<AdvisorComplianceRow[]>(`/kpis/advisor-compliance/current${suffix}`, { token }),
        apiFetch<AdvisorComplianceRow[]>(`/kpis/advisor-compliance/previous${suffix}`, { token }),
        apiFetch<RegionalProgressRow[]>(`/kpis/regional-progress/current${suffix}`, { token }),
        apiFetch<RegionalProgressRow[]>(`/kpis/regional-progress/previous${suffix}`, { token }),
        apiFetch<DailySalesRow[]>(`/kpis/daily-sales${suffix}`, { token }),
        apiFetch<ReportingTracking>('/kpis/reporting-tracking', { token })
      ]);

      setCatalogs(catalogsRes);
      setReport(reportRes);
      setComplianceCurrent(complianceCurrentRes);
      setCompliancePrevious(compliancePreviousRes);
      setRegionalCurrent(regionalCurrentRes);
      setRegionalPrevious(regionalPreviousRes);
      setDailySales(dailySalesRes);
      setTracking(trackingRes);
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(initialFilters);
  }, []);

  const onApplyFilters = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadData(filters);
  };

  const trendComparative = useMemo(() => {
    if (!report) return [];
    const currentByDay = new Map<number, number>();
    const previousByDay = new Map<number, number>();

    report.mesActual.tendencia.forEach((item) => {
      currentByDay.set(asDay(item.sale_date), Number(item.nominal));
    });
    report.mesAnterior.tendencia.forEach((item) => {
      previousByDay.set(asDay(item.sale_date), Number(item.nominal));
    });

    const allDays = Array.from(new Set([...currentByDay.keys(), ...previousByDay.keys()])).sort((a, b) => a - b);
    return allDays.map((day) => ({
      dia: day,
      mesActual: currentByDay.get(day) ?? 0,
      mesAnterior: previousByDay.get(day) ?? 0
    }));
  }, [report]);

  const previousMonth = useMemo(() => {
    if (!report?.month) return '';
    const [year, month] = report.month.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [report?.month]);

  const salesCurrent = useMemo(
    () => dailySales.filter((item) => item.fecha_diligenciamiento.startsWith(report?.month ?? '')),
    [dailySales, report?.month]
  );

  const salesPrevious = useMemo(
    () => dailySales.filter((item) => (previousMonth ? item.fecha_diligenciamiento.startsWith(previousMonth) : false)),
    [dailySales, previousMonth]
  );

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card p-5"
      >
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{role}</p>
        <h1 className="text-3xl font-semibold mt-1">Dashboard de cumplimiento y comparativos</h1>
        <p className="text-slate-300 text-sm mt-2">
          Reportes de ventas, cumplimiento de asesores, avances regionales y seguimiento operativo.
        </p>
      </motion.header>

      <motion.form
        onSubmit={onApplyFilters}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45 }}
        className="glass-card p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3"
      >
        <select
          value={filters.regionalId}
          onChange={(e) => setFilters((p) => ({ ...p, regionalId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Regional</option>
          {(catalogs?.regionals ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.zoneId}
          onChange={(e) => setFilters((p) => ({ ...p, zoneId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Zona</option>
          {(catalogs?.zones ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.directorId}
          onChange={(e) => setFilters((p) => ({ ...p, directorId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Director</option>
          {(catalogs?.directors ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.coordinatorId}
          onChange={(e) => setFilters((p) => ({ ...p, coordinatorId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Coordinador</option>
          {(catalogs?.coordinators ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.advisorId}
          onChange={(e) => setFilters((p) => ({ ...p, advisorId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Asesor</option>
          {(catalogs?.advisors ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.statusId}
          onChange={(e) => setFilters((p) => ({ ...p, statusId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Status</option>
          {(catalogs?.statuses ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.quincena}
          onChange={(e) => setFilters((p) => ({ ...p, quincena: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Quincena</option>
          <option value="1">Primera</option>
          <option value="2">Segunda</option>
        </select>
        <select
          value={filters.planId}
          onChange={(e) => setFilters((p) => ({ ...p, planId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Plan</option>
          {(catalogs?.plans ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={filters.serviceId}
          onChange={(e) => setFilters((p) => ({ ...p, serviceId: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        >
          <option value="">Servicio adicional</option>
          {(catalogs?.services ?? []).map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black"
        />
        <input
          type="text"
          placeholder="Buscar nombre asesor..."
          value={advisorNameFilter}
          onChange={(e) => setAdvisorNameFilter(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black col-span-2 xl:col-span-2"
        />
        <button className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2">Aplicar filtros</button>
      </motion.form>

      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm">Cargando dashboard...</p> : null}

      {/* Leyenda semáforo */}
      <div className="glass-card px-4 py-2 flex flex-wrap gap-4 text-xs text-slate-300">
        <span className="font-semibold text-slate-400 uppercase tracking-wide">Semáforo:</span>
        <span className="text-rose-400 font-bold">🔴 Crítico (&lt;40%)</span>
        <span className="text-orange-400 font-bold">🟠 Bajo (40–59%)</span>
        <span className="text-yellow-400 font-bold">🟡 Medio (60–79%)</span>
        <span className="text-green-400 font-bold">🟢 Cumplido (80–99%)</span>
        <span className="text-cyan-400 font-bold">🔵 Sobre-cumplimiento (≥100%)</span>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">Reporte de ventas mes en curso</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              title="Total ventas reportadas"
              value={String(report?.mesActual.resumen.total_ventas_reportadas ?? 0)}
            />
            <KpiCard title="Nominal reportado" value={money(report?.mesActual.resumen.nominal_reportado)} />
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={report?.mesActual.quincena ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="quincena" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad_ventas" fill="#23c7d9" name="Cantidad" />
                <Bar dataKey="nominal" fill="#6ef2c8" name="Nominal" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">Reporte de ventas mes anterior</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              title="Total ventas reportadas"
              value={String(report?.mesAnterior.resumen.total_ventas_reportadas ?? 0)}
            />
            <KpiCard title="Nominal reportado" value={money(report?.mesAnterior.resumen.nominal_reportado)} />
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={report?.mesAnterior.quincena ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="quincena" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad_ventas" fill="#ffb142" name="Cantidad" />
                <Bar dataKey="nominal" fill="#ff6b81" name="Nominal" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-4"
      >
        <h2 className="text-lg font-semibold mb-3">Tendencia temporal y picos de actividad</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={trendComparative}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mesActual" stroke="#23c7d9" strokeWidth={3} />
              <Line type="monotone" dataKey="mesAnterior" stroke="#ffb142" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Ventas por plan (mes actual)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={report?.mesActual.plan ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="plan" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="nominal" fill="#23c7d9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Distribucion por status (mes actual)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={report?.mesActual.status ?? []} dataKey="nominal" nameKey="status" outerRadius={92} label>
                  {(report?.mesActual.status ?? []).map((item, idx) => (
                    <Cell key={item.status} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Servicios adicionales vendidos (mes actual)</h3>
          <div className="space-y-2 max-h-64 overflow-auto">
            {(report?.mesActual.servicios ?? []).map((row) => (
              <div key={row.servicio} className="rounded-lg border border-cyan/20 bg-slate-900/45 px-3 py-2">
                <p className="font-medium">{row.servicio}</p>
                <p className="text-xs text-slate-300">
                  Cantidad: {row.cantidad_ventas} | Nominal: {money(row.nominal)}
                </p>
              </div>
            ))}
            {(report?.mesActual.servicios ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No hay servicios para el filtro aplicado.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="text-lg font-semibold mb-2">Cumplimiento asesores mes actual</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300 border-b border-slate-700">
                <th className="py-2 pr-3">Director</th>
                <th className="py-2 pr-3">Regional</th>
                <th className="py-2 pr-3">Zona</th>
                <th className="py-2 pr-3">Cedula asesor</th>
                <th className="py-2 pr-3">Nombre asesor</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Presupuesto</th>
                <th className="py-2 pr-3">Llevamos</th>
                <th className="py-2 pr-3">Cantidad ventas</th>
                <th className="py-2 pr-3">Nos falta</th>
                <th className="py-2 pr-3">Debemos diario</th>
                <th className="py-2 pr-3">% Cumplimiento</th>
                <th className="py-2 pr-3">Proyeccion cierre</th>
                <th className="py-2 pr-3">% Proyeccion</th>
              </tr>
            </thead>
            <tbody>
              {complianceCurrent
                .filter((row) =>
                  advisorNameFilter
                    ? row.nombreAsesor.toLowerCase().includes(advisorNameFilter.toLowerCase())
                    : true
                )
                .slice((complianceCurrPage - 1) * COMP_PAGE_SIZE, complianceCurrPage * COMP_PAGE_SIZE)
                .map((row, idx) => (
                <tr key={`${row.cedulaAsesor}-${idx}`} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 pr-3">{row.director}</td>
                  <td className="py-2 pr-3">{row.regional}</td>
                  <td className="py-2 pr-3">{row.zona}</td>
                  <td className="py-2 pr-3">{row.cedulaAsesor}</td>
                  <td className="py-2 pr-3">{row.nombreAsesor}</td>
                  <td className="py-2 pr-3">{row.categoria}</td>
                  <td className="py-2 pr-3">{money(row.presupuesto)}</td>
                  <td className="py-2 pr-3">{money(row.llevamos)}</td>
                  <td className="py-2 pr-3">{row.cantidadVentas}</td>
                  <td className="py-2 pr-3">{money(row.nosFalta)}</td>
                  <td className="py-2 pr-3">{row.debemosHacerDiario === null ? '-' : money(row.debemosHacerDiario)}</td>
                  <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimiento)}`}>
                    {semaphoreEmoji(row.porcentajeCumplimiento)} {pct(row.porcentajeCumplimiento)}
                  </td>
                  <td className="py-2 pr-3">{money(row.proyeccionCierre)}</td>
                  <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeProyeccion)}`}>
                    {pct(row.porcentajeProyeccion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación mes actual */}
        {(() => {
          const filteredRows = complianceCurrent.filter((r) =>
            advisorNameFilter ? r.nombreAsesor.toLowerCase().includes(advisorNameFilter.toLowerCase()) : true
          );
          const totalPages = Math.ceil(filteredRows.length / COMP_PAGE_SIZE);
          if (totalPages <= 1) return null;
          return (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60">
              <p className="text-xs text-slate-400">Pág {complianceCurrPage} de {totalPages} · {filteredRows.length} asesores</p>
              <div className="flex gap-1">
                <button disabled={complianceCurrPage === 1} onClick={() => setComplianceCurrPage((p) => p - 1)}
                  className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, complianceCurrPage - 2);
                  const page = start + i;
                  if (page > totalPages) return null;
                  return (
                    <button key={page} onClick={() => setComplianceCurrPage(page)}
                      className={`px-3 py-1 rounded text-xs border ${
                        page === complianceCurrPage
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-700 hover:bg-slate-800'
                      }`}>{page}</button>
                  );
                })}
                <button disabled={complianceCurrPage >= totalPages} onClick={() => setComplianceCurrPage((p) => p + 1)}
                  className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">›</button>
              </div>
            </div>
          );
        })()}
      </section>

      <section className="glass-card p-4">
        <h2 className="text-lg font-semibold mb-2">Cumplimiento asesores mes anterior</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300 border-b border-slate-700">
                <th className="py-2 pr-3">Director</th>
                <th className="py-2 pr-3">Regional</th>
                <th className="py-2 pr-3">Zona</th>
                <th className="py-2 pr-3">Cedula asesor</th>
                <th className="py-2 pr-3">Nombre asesor</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Presupuesto</th>
                <th className="py-2 pr-3">Llevamos</th>
                <th className="py-2 pr-3">Cantidad ventas</th>
                <th className="py-2 pr-3">Nos falta</th>
                <th className="py-2 pr-3">% Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {compliancePrevious
                .filter((row) =>
                  advisorNameFilter
                    ? row.nombreAsesor.toLowerCase().includes(advisorNameFilter.toLowerCase())
                    : true
                )
                .slice((compliancePrevPage - 1) * COMP_PAGE_SIZE, compliancePrevPage * COMP_PAGE_SIZE)
                .map((row, idx) => (
                <tr key={`${row.cedulaAsesor}-prev-${idx}`} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 pr-3">{row.director}</td>
                  <td className="py-2 pr-3">{row.regional}</td>
                  <td className="py-2 pr-3">{row.zona}</td>
                  <td className="py-2 pr-3">{row.cedulaAsesor}</td>
                  <td className="py-2 pr-3">{row.nombreAsesor}</td>
                  <td className="py-2 pr-3">{row.categoria}</td>
                  <td className="py-2 pr-3">{money(row.presupuesto)}</td>
                  <td className="py-2 pr-3">{money(row.llevamos)}</td>
                  <td className="py-2 pr-3">{row.cantidadVentas}</td>
                  <td className="py-2 pr-3">{money(row.nosFalta)}</td>
                  <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimiento)}`}>
                    {semaphoreEmoji(row.porcentajeCumplimiento)} {pct(row.porcentajeCumplimiento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación mes anterior */}
        {(() => {
          const filteredRows = compliancePrevious.filter((r) =>
            advisorNameFilter ? r.nombreAsesor.toLowerCase().includes(advisorNameFilter.toLowerCase()) : true
          );
          const totalPages = Math.ceil(filteredRows.length / COMP_PAGE_SIZE);
          if (totalPages <= 1) return null;
          return (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60">
              <p className="text-xs text-slate-400">Pág {compliancePrevPage} de {totalPages} · {filteredRows.length} asesores</p>
              <div className="flex gap-1">
                <button disabled={compliancePrevPage === 1} onClick={() => setCompliancePrevPage((p) => p - 1)}
                  className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, compliancePrevPage - 2);
                  const page = start + i;
                  if (page > totalPages) return null;
                  return (
                    <button key={page} onClick={() => setCompliancePrevPage(page)}
                      className={`px-3 py-1 rounded text-xs border ${
                        page === compliancePrevPage
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-700 hover:bg-slate-800'
                      }`}>{page}</button>
                  );
                })}
                <button disabled={compliancePrevPage >= totalPages} onClick={() => setCompliancePrevPage((p) => p + 1)}
                  className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">›</button>
              </div>
            </div>
          );
        })()}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-2">Como vamos mes actual (regional)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  <th className="py-2 pr-3">Regional</th>
                  <th className="py-2 pr-3">Presupuesto 100%</th>
                  <th className="py-2 pr-3">Llevamos</th>
                  <th className="py-2 pr-3">% 100%</th>
                  <th className="py-2 pr-3">Falta</th>
                  <th className="py-2 pr-3">Debo diario</th>
                  <th className="py-2 pr-3">Presupuesto 120%</th>
                  <th className="py-2 pr-3">% 120%</th>
                  <th className="py-2 pr-3">Proyeccion</th>
                </tr>
              </thead>
              <tbody>
                {regionalCurrent.map((row, idx) => (
                  <tr key={`reg-cur-${idx}`} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3 font-medium">{row.regional}</td>
                    <td className="py-2 pr-3">{money(row.presupuesto100)}</td>
                    <td className="py-2 pr-3">{money(row.llevamos)}</td>
                    <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimiento100)}`}>
                      {semaphoreEmoji(row.porcentajeCumplimiento100)} {pct(row.porcentajeCumplimiento100)}
                    </td>
                    <td className="py-2 pr-3 text-rose-300">{money(row.falta)}</td>
                    <td className="py-2 pr-3">{row.metaDiariaRequerida === null ? '-' : money(row.metaDiariaRequerida)}</td>
                    <td className="py-2 pr-3">{money(row.presupuesto120)}</td>
                    <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimiento120)}`}>
                      {semaphoreEmoji(row.porcentajeCumplimiento120)} {pct(row.porcentajeCumplimiento120)}
                    </td>
                    <td className="py-2 pr-3">{money(row.proyeccionCierre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-2">Como vamos mes anterior</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  <th className="py-2 pr-3">Regional</th>
                  <th className="py-2 pr-3">Presupuesto 100%</th>
                  <th className="py-2 pr-3">Llevamos</th>
                  <th className="py-2 pr-3">% 100%</th>
                  <th className="py-2 pr-3">Presupuesto 120%</th>
                  <th className="py-2 pr-3">% 120%</th>
                  <th className="py-2 pr-3">Aprobado</th>
                  <th className="py-2 pr-3">% Cumplimiento aprobado</th>
                  <th className="py-2 pr-3">% Aprobado vs cantado</th>
                  <th className="py-2 pr-3">% Caidas vs cantadas</th>
                </tr>
              </thead>
              <tbody>
                {regionalPrevious.map((row, idx) => (
                  <tr key={`reg-prev-${idx}`} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3 font-medium">{row.regional}</td>
                    <td className="py-2 pr-3">{money(row.presupuesto100)}</td>
                    <td className="py-2 pr-3">{money(row.llevamos)}</td>
                    <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimiento100)}`}>
                      {semaphoreEmoji(row.porcentajeCumplimiento100)} {pct(row.porcentajeCumplimiento100)}
                    </td>
                    <td className="py-2 pr-3">{money(row.presupuesto120)}</td>
                    <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimiento120)}`}>
                      {semaphoreEmoji(row.porcentajeCumplimiento120)} {pct(row.porcentajeCumplimiento120)}
                    </td>
                    <td className="py-2 pr-3">{money(row.aprobado)}</td>
                    <td className={`py-2 pr-3 ${semaphoreClass(row.porcentajeCumplimientoAprobado)}`}>
                      {pct(row.porcentajeCumplimientoAprobado)}
                    </td>
                    <td className="py-2 pr-3">{pct(row.porcentajeAprobadoVsCantado)}</td>
                    <td className="py-2 pr-3 text-rose-300">{pct(row.porcentajeCaidasVsCantadas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-2">Ventas por dia mes actual</h2>
          <div className="overflow-x-auto max-h-[320px]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  <th className="py-2 pr-3">Regional</th>
                  <th className="py-2 pr-3">Zona</th>
                  <th className="py-2 pr-3">Cedula</th>
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {salesCurrent.slice(0, 120).map((row, idx) => (
                  <tr key={`day-cur-${idx}`} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3">{row.regional}</td>
                    <td className="py-2 pr-3">{row.zona}</td>
                    <td className="py-2 pr-3">{row.cedula_asesor}</td>
                    <td className="py-2 pr-3">{row.nombre_asesor}</td>
                    <td className="py-2 pr-3">{row.fecha_diligenciamiento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-2">Ventas por dia mes anterior</h2>
          <div className="overflow-x-auto max-h-[320px]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  <th className="py-2 pr-3">Regional</th>
                  <th className="py-2 pr-3">Zona</th>
                  <th className="py-2 pr-3">Cedula</th>
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {salesPrevious.slice(0, 120).map((row, idx) => (
                  <tr key={`day-prev-${idx}`} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3">{row.regional}</td>
                    <td className="py-2 pr-3">{row.zona}</td>
                    <td className="py-2 pr-3">{row.cedula_asesor}</td>
                    <td className="py-2 pr-3">{row.nombre_asesor}</td>
                    <td className="py-2 pr-3">{row.fecha_diligenciamiento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Reportado en el mes" value={String(tracking?.reportado_mes ?? 0)} />
        <KpiCard title="Reportado semana pasada" value={String(tracking?.reportado_semana_pasada ?? 0)} />
        <KpiCard title="Reportado esta semana" value={String(tracking?.reportado_esta_semana ?? 0)} />
        <KpiCard title="Reportado hoy" value={String(tracking?.reportado_hoy ?? 0)} />
      </section>

      <section className="glass-card p-4">
        <h3 className="font-semibold mb-2">Variacion comparativa</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            title="Variacion nominal vs mes anterior"
            value={money(report?.comparativo.nominalVariation)}
            hint={pct(report?.comparativo.nominalVariationPct ?? null)}
            tone={(report?.comparativo.nominalVariation ?? 0) >= 0 ? 'good' : 'warn'}
          />
          <KpiCard
            title="Variacion total de ventas"
            value={String(report?.comparativo.totalSalesVariation ?? 0)}
            tone={(report?.comparativo.totalSalesVariation ?? 0) >= 0 ? 'good' : 'warn'}
          />
          <div className="glass-card p-4 border border-cyan/20">
            <p className="text-xs text-slate-400 uppercase tracking-[0.12em] mb-2">Picos actividad mes actual</p>
            <div className="space-y-1 text-sm">
              {(report?.mesActual.picosActividad ?? []).map((peak, idx) => (
                <div key={`${peak.sale_date}-${idx}`} className="flex items-center justify-between">
                  <span>{peak.sale_date}</span>
                  <span>{money(peak.nominal)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
