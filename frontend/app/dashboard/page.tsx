'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/KpiCard';
import { SalesTrendChart } from '@/components/SalesTrendChart';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type SummaryResponse = {
  month: string;
  current_total_sales: number;
  current_nominal_reported: string;
  previous_total_sales: number;
  previous_nominal_reported: string;
  total_sales_variation: number;
  nominal_variation: string;
  nominal_variation_pct: string | null;
};

type ReportingTracking = {
  reportado_mes: number;
  reportado_semana_pasada: number;
  reportado_esta_semana: number;
  reportado_hoy: number;
};

type ComplianceRow = {
  nombreAsesor: string;
  porcentajeCumplimiento: number;
  nosFalta: number;
};

type DailySaleRow = { fecha_diligenciamiento: string; nominal: string | number };

const AUTO_REFRESH_MS = 15000;

function semaphoreClass(v: number): string {
  if (v >= 100) return 'text-cyan-400';
  if (v >= 80)  return 'text-green-400';
  if (v >= 60)  return 'text-yellow-400';
  if (v >= 40)  return 'text-orange-400';
  return 'text-rose-400';
}

function semaphoreLabel(v: number): string {
  if (v >= 100) return 'Sobre meta';
  if (v >= 80)  return 'En meta';
  if (v >= 60)  return 'Medio';
  if (v >= 40)  return 'Bajo';
  return 'Critico';
}

export default function DashboardHomePage() {
  const router = useRouter();
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [reporting, setReporting] = useState<ReportingTracking | null>(null);
  const [dailySales, setDailySales] = useState<DailySaleRow[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [error, setError] = useState('');

  const loadData = async (selectedMonth: string) => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) return;
    if (user.role === 'DIRECTOR') { router.replace('/dashboard/director'); return; }
    if (user.role === 'COORDINADOR') { router.replace('/dashboard/coordinador'); return; }
    setLoading(true); setError('');
    const q = selectedMonth ? `?month=${selectedMonth}` : '';
    try {
      const [summaryRes, reportingRes, dailySalesRes, complianceRes] = await Promise.all([
        apiFetch<SummaryResponse>(`/kpis/summary${q}`, { token }),
        apiFetch<ReportingTracking>('/kpis/reporting-tracking', { token }),
        apiFetch<DailySaleRow[]>(`/kpis/daily-sales${q}`, { token }),
        apiFetch<ComplianceRow[]>(`/kpis/advisor-compliance/current${q}`, { token })
      ]);
      setSummary(summaryRes); setReporting(reportingRes);
      setDailySales(dailySalesRes); setCompliance(complianceRes);
    } catch (err: any) { setError(err.message || 'No fue posible cargar KPIs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(month); }, []);
  useEffect(() => {
    const timerId = window.setInterval(() => {
      loadData(month);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timerId);
  }, [month]);

  const topRisk = useMemo(
    () => [...compliance].sort((a, b) => a.porcentajeCumplimiento - b.porcentajeCumplimiento).slice(0, 8),
    [compliance]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Panel ejecutivo</p>
          <h1 className="text-3xl font-semibold mt-1">Vista general comercial</h1>
          <p className="text-slate-300 text-sm mt-2">
            Monitoreo de mes actual vs anterior, seguimiento de reportes y asesores en riesgo.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs text-slate-400 whitespace-nowrap">Mes a visualizar</label>
          <input
            type="month"
            value={month}
            max={thisMonth}
            onChange={(e) => { setMonth(e.target.value); loadData(e.target.value); }}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium text-sm"
          />
          {loading && <span className="text-xs text-cyan-400 animate-pulse">Cargando...</span>}
        </div>
        <p className="text-[11px] text-slate-400">Actualizacion automatica cada 15 segundos.</p>
      </motion.header>

      {error ? <p className="text-rose text-sm">{error}</p> : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas Reportadas"
          value={summary ? String(summary.current_total_sales) : '...'}
          hint={`Mes ${summary?.month || ''}`}
        />
        <KpiCard
          title="Nominal Reportado"
          value={summary ? `$${Number(summary.current_nominal_reported).toLocaleString('es-CO')}` : '...'}
        />
        <KpiCard
          title="Variacion Nominal"
          value={summary ? `$${Number(summary.nominal_variation).toLocaleString('es-CO')}` : '...'}
          hint={summary?.nominal_variation_pct ? `${summary.nominal_variation_pct}%` : 'Sin base comparativa'}
          tone={summary && Number(summary.nominal_variation) >= 0 ? 'good' : 'warn'}
        />
        <KpiCard
          title="Reportado Hoy"
          value={reporting ? String(reporting.reportado_hoy) : '...'}
          hint={reporting ? `Semana: ${reporting.reportado_esta_semana}` : ''}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <SalesTrendChart data={dailySales} month={month} />
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-1">Asesores en riesgo</h2>
          <p className="text-xs text-slate-400 mb-3">Menor cumplimiento de presupuesto — {month}</p>
          <div className="space-y-2">
            {topRisk.map((advisor) => (
              <div
                key={advisor.nombreAsesor}
                className="rounded-xl border border-rose/25 bg-rose/10 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{advisor.nombreAsesor}</p>
                  <p className="text-xs text-slate-300">Falta: ${advisor.nosFalta.toLocaleString('es-CO')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${semaphoreClass(advisor.porcentajeCumplimiento)}`}>
                    {advisor.porcentajeCumplimiento}%
                  </p>
                  <p className="text-[10px] text-slate-400">{semaphoreLabel(advisor.porcentajeCumplimiento)}</p>
                </div>
              </div>
            ))}
            {topRisk.length === 0 ? <p className="text-sm text-slate-400">Sin datos de cumplimiento.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
