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

export default function DashboardHomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [reporting, setReporting] = useState<ReportingTracking | null>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) return;

    if (user.role === 'DIRECTOR') {
      router.replace('/dashboard/director');
      return;
    }
    if (user.role === 'COORDINADOR') {
      router.replace('/dashboard/coordinador');
      return;
    }

    Promise.all([
      apiFetch<SummaryResponse>('/kpis/summary', { token }),
      apiFetch<ReportingTracking>('/kpis/reporting-tracking', { token }),
      apiFetch<any[]>('/kpis/daily-sales', { token }),
      apiFetch<ComplianceRow[]>('/kpis/advisor-compliance/current', { token })
    ])
      .then(([summaryRes, reportingRes, dailySalesRes, complianceRes]) => {
        setSummary(summaryRes);
        setReporting(reportingRes);
        setDailySales(dailySalesRes);
        setCompliance(complianceRes);
      })
      .catch((err: any) => setError(err.message || 'No fue posible cargar KPIs'));
  }, [router]);

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
        className="glass-card p-5"
      >
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Panel ejecutivo</p>
        <h1 className="text-3xl font-semibold mt-1">Vista general comercial</h1>
        <p className="text-slate-300 text-sm mt-2">
          Monitoreo de mes actual vs anterior, seguimiento de reportes y asesores en riesgo.
        </p>
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
        <SalesTrendChart data={dailySales} />
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-3">Asesores en riesgo</h2>
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
                <span className="text-rose font-semibold">{advisor.porcentajeCumplimiento}%</span>
              </div>
            ))}
            {topRisk.length === 0 ? <p className="text-sm text-slate-400">Sin datos de cumplimiento.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
