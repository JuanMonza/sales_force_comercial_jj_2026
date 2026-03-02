'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart,
  CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

type SaleRow = {
  id: string;
  sale_date: string;
  advisor_name: string;
  regional_name: string;
  zone_name: string;
  plan_name: string | null;
  status_name: string | null;
  sale_amount: string | number;
  approved_amount: string | number;
  coordinator_name?: string;
};

const CHART_TYPES = ['Barras', 'Cilindro', 'Velas'] as const;
type ChartType = typeof CHART_TYPES[number];

const PALETTE = [
  '#23c7d9','#6ef2c8','#ffb142','#ff6b81','#748ffc',
  '#80ed99','#a29bfe','#fd79a8','#ffeaa7','#74b9ff',
  '#55efc4','#fdcb6e','#e17055','#81ecec','#dfe6e9'
];

function money(v: number | string) {
  return `$${Number(v).toLocaleString('es-CO')}`;
}

function shortName(s: string, max = 14) {
  return s.length > max ? s.slice(0, max - 1) + '.' : s;
}

const TT = {
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#cbd5e1' },
};

function semaphoreColor(pct: number): string {
  if (pct >= 100) return '#23c7d9';
  if (pct >= 80)  return '#4ade80';
  if (pct >= 60)  return '#facc15';
  if (pct >= 40)  return '#fb923c';
  return '#f87171';
}

function ChartBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-800 overflow-hidden w-full">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

type ChartPanelProps = {
  title: string;
  data: { name: string; valor: number }[];
  chartType: ChartType;
  height?: number;
  useSemaphore?: boolean;
  maxVal?: number;
};

function ChartPanel({ title, data, chartType, height = 220, useSemaphore, maxVal }: ChartPanelProps) {
  if (!data.length) return null;
  const max = maxVal ?? Math.max(...data.map(d => d.valor), 1);
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'Velas' ? (
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#23c7d9" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#23c7d9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip {...TT} formatter={(v: number) => [v.toLocaleString('es-CO'), 'Valor']} />
            <Area type="monotone" dataKey="valor" stroke="#23c7d9" strokeWidth={2} fill="url(#ag)" />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip {...TT} formatter={(v: number) => [v.toLocaleString('es-CO'), 'Valor']} />
            <Bar
              dataKey="valor"
              radius={chartType === 'Cilindro' ? [10, 10, 0, 0] : [3, 3, 0, 0]}
              maxBarSize={chartType === 'Cilindro' ? 30 : 50}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={useSemaphore ? semaphoreColor((d.valor / max) * 100) : PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

type CompChartProps = {
  title: string;
  data: { name: string; mesActual: number; mesAnterior: number }[];
  chartType: ChartType;
};

function CompChart({ title, data, chartType }: CompChartProps) {
  if (!data.length) return null;
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      <div className="flex gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#23c7d9' }} /> Mes actual
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#748ffc' }} /> Mes anterior
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {chartType === 'Velas' ? (
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#23c7d9" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#23c7d9" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#748ffc" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#748ffc" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip {...TT} formatter={(v: number, n: string) => [v.toLocaleString('es-CO'), n === 'mesActual' ? 'Mes actual' : 'Mes anterior']} />
            <Area type="monotone" dataKey="mesActual" stroke="#23c7d9" strokeWidth={2} fill="url(#ga)" />
            <Area type="monotone" dataKey="mesAnterior" stroke="#748ffc" strokeWidth={2} fill="url(#gb)" />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip {...TT} formatter={(v: number, n: string) => [v.toLocaleString('es-CO'), n === 'mesActual' ? 'Mes actual' : 'Mes anterior']} />
            <Legend formatter={(v) => v === 'mesActual' ? 'Mes actual' : 'Mes anterior'} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Bar dataKey="mesActual" fill="#23c7d9" radius={chartType === 'Cilindro' ? [8, 8, 0, 0] : [3, 3, 0, 0]} maxBarSize={chartType === 'Cilindro' ? 22 : 40} />
            <Bar dataKey="mesAnterior" fill="#748ffc" radius={chartType === 'Cilindro' ? [8, 8, 0, 0] : [3, 3, 0, 0]} maxBarSize={chartType === 'Cilindro' ? 22 : 40} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [chartType, setChartType] = useState<ChartType>('Barras');
  const [openRegionals, setOpenRegionals] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSales = async (params?: { startDate?: string; endDate?: string }) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      query.set('limit', '2000');
      const data = await apiFetch<SaleRow[]>(`/sales?${query.toString()}`, { token });
      setRows(data);
      const regions: Record<string, boolean> = {};
      data.forEach((r) => { regions[r.regional_name] = true; });
      setOpenRegionals(regions);
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const onApply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchSales({ startDate, endDate });
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const byAdvisor = advisorFilter
        ? r.advisor_name.toLowerCase().includes(advisorFilter.toLowerCase()) : true;
      const byCoord = coordinatorFilter
        ? (r.coordinator_name ?? '').toLowerCase().includes(coordinatorFilter.toLowerCase()) : true;
      return byAdvisor && byCoord;
    });
  }, [rows, advisorFilter, coordinatorFilter]);

  // Comparativa mes vs mes anterior derivada de sale_date
  const monthlyComp = useMemo(() => {
    const byMonth: Record<string, { amount: number; count: number }> = {};
    filtered.forEach((r) => {
      const m = r.sale_date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { amount: 0, count: 0 };
      byMonth[m].amount += Number(r.sale_amount);
      byMonth[m].count += 1;
    });
    const months = Object.keys(byMonth).sort();
    if (months.length < 2) return null;
    // Tomar los ultimos 6 meses maximo para la comparativa
    const last = months.slice(-6);
    return {
      countData: last.map((m, i) => ({
        name: m.slice(5) + '/' + m.slice(2, 4),
        mesActual: byMonth[m].count,
        mesAnterior: i > 0 ? byMonth[last[i - 1]].count : 0,
      })),
      nominalData: last.map((m, i) => ({
        name: m.slice(5) + '/' + m.slice(2, 4),
        mesActual: Math.round(byMonth[m].amount),
        mesAnterior: i > 0 ? Math.round(byMonth[last[i - 1]].amount) : 0,
      })),
      months: last,
    };
  }, [filtered]);

  // Graficas de distribucion
  const byRegionalChart = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    filtered.forEach((r) => {
      if (!map[r.regional_name]) map[r.regional_name] = { count: 0, amount: 0 };
      map[r.regional_name].count++;
      map[r.regional_name].amount += Number(r.sale_amount);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => ({ name: shortName(k), valor: v.count, nominal: Math.round(v.amount) }));
  }, [filtered]);

  const byPlanChart = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const k = r.plan_name || 'Sin plan';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, valor]) => ({ name: shortName(name), valor }));
  }, [filtered]);

  const byStatusChart = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const k = r.status_name || 'Sin estado';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, valor]) => ({ name: shortName(name), valor }));
  }, [filtered]);

  const topAdvisorsCount = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.advisor_name] = (map[r.advisor_name] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, valor]) => ({ name: shortName(name), valor }));
  }, [filtered]);

  const topAdvisorsNominal = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.advisor_name] = (map[r.advisor_name] || 0) + Number(r.sale_amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, valor]) => ({ name: shortName(name), valor: Math.round(valor) }));
  }, [filtered]);

  const byZoneChart = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.zone_name] = (map[r.zone_name] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([name, valor]) => ({ name: shortName(name), valor }));
  }, [filtered]);

  const nominalByRegional = useMemo(() =>
    byRegionalChart.map(d => ({ name: d.name, valor: d.nominal ?? 0 })),
    [byRegionalChart]
  );

  // Acordeon por regional
  const byRegional = useMemo(() => {
    const map: Record<string, SaleRow[]> = {};
    filtered.forEach((r) => {
      if (!map[r.regional_name]) map[r.regional_name] = [];
      map[r.regional_name].push(r);
    });
    return map;
  }, [filtered]);

  const regionals = Object.keys(byRegional).sort();
  const maxRegionalSales = Math.max(...regionals.map((k) => byRegional[k].length), 1);

  const toggleRegional = (name: string) =>
    setOpenRegionals((prev) => ({ ...prev, [name]: !prev[name] }));

  const hasFilter = advisorFilter || coordinatorFilter;

  return (
    <div className="space-y-4">
      {/* Encabezado + selector */}
      <header className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ventas por periodo</h1>
          <p className="text-slate-300 text-sm mt-1">
            Analisis comparativo mes a mes. Filtra por asesor o coordinador para comparativas especificas.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-700">
          {CHART_TYPES.map((type) => (
            <button key={type} onClick={() => setChartType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartType === type
                  ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>
              {type === 'Barras' ? 'Barras' : type === 'Cilindro' ? 'Cilindros' : 'Area'}
            </button>
          ))}
        </div>
      </header>

      {/* Filtros */}
      <form onSubmit={onApply} className="glass-card p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Fecha inicio</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Fecha fin</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Buscar asesor</label>
          <input type="text" placeholder="Nombre asesor..." value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium placeholder:text-slate-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Buscar coordinador</label>
          <input type="text" placeholder="Nombre coordinador..." value={coordinatorFilter}
            onChange={(e) => setCoordinatorFilter(e.target.value)}
            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium placeholder:text-slate-500" />
        </div>
        <button type="submit" className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2 hover:brightness-110">
          Aplicar
        </button>
        <button type="button"
          onClick={() => { setStartDate(''); setEndDate(''); setAdvisorFilter(''); setCoordinatorFilter(''); fetchSales(); }}
          className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300">
          Limpiar
        </button>
      </form>

      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm animate-pulse">Cargando ventas...</p> : null}
      {hasFilter && (
        <p className="text-xs text-cyan px-1">
          Filtro activo: {[advisorFilter && `asesor "${advisorFilter}"`, coordinatorFilter && `coordinador "${coordinatorFilter}"`].filter(Boolean).join(', ')} — {filtered.length} ventas encontradas
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total ventas', value: filtered.length.toLocaleString('es-CO'), color: 'text-white' },
          { label: 'Nominal total', value: money(filtered.reduce((s, r) => s + Number(r.sale_amount), 0)), color: 'text-cyan' },
          { label: 'Regionales', value: regionals.length.toLocaleString('es-CO'), color: 'text-white' },
          { label: 'Aprobado total', value: money(filtered.reduce((s, r) => s + Number(r.approved_amount), 0)), color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Comparativa mensual — aparece cuando hay datos de varios meses */}
      {monthlyComp && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-300 px-1">Comparativa mes a mes</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CompChart title="Cantidad de ventas — mes actual vs anterior" data={monthlyComp.countData} chartType={chartType} />
            <CompChart title="Nominal ($) — mes actual vs anterior" data={monthlyComp.nominalData} chartType={chartType} />
          </div>
        </div>
      )}

      {/* Graficas de distribucion */}
      <p className="text-sm font-semibold text-slate-300 px-1">Distribucion de ventas</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <ChartPanel title="Ventas por regional (cantidad)" data={byRegionalChart} chartType={chartType} />
        <ChartPanel title="Ventas por regional (nominal $)" data={nominalByRegional} chartType={chartType} useSemaphore />
        <ChartPanel title="Ventas por plan" data={byPlanChart} chartType={chartType} />
        <ChartPanel title="Ventas por estado" data={byStatusChart} chartType={chartType} />
        <ChartPanel title="Top 10 asesores (cantidad de ventas)" data={topAdvisorsCount} chartType={chartType} useSemaphore />
        <ChartPanel title="Top 10 asesores (nominal $)" data={topAdvisorsNominal} chartType={chartType} />
        <ChartPanel title="Ventas por zona" data={byZoneChart} chartType={chartType} />
      </div>

      {/* Acordeon por regional */}
      <p className="text-sm font-semibold text-slate-300 px-1">Detalle por regional</p>
      <div className="space-y-3">
        {regionals.map((regional, ridx) => {
          const sales = byRegional[regional];
          const isOpen = !!openRegionals[regional];
          const nominal = sales.reduce((s, r) => s + Number(r.sale_amount), 0);
          const pct = (sales.length / maxRegionalSales) * 100;

          return (
            <motion.div key={regional}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ridx * 0.04 }}
              className="glass-card overflow-hidden">
              <button onClick={() => toggleRegional(regional)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                <motion.span
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="text-cyan">
                  &#9654;
                </motion.span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">{regional}</p>
                  <div className="mt-1">
                    <ChartBar pct={pct} color={semaphoreColor(pct)} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-cyan">{sales.length} ventas</p>
                  <p className="text-xs text-slate-400">{money(nominal)}</p>
                </div>
                <span className="ml-2 text-slate-400">{isOpen ? '▲' : '▼'}</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div key="content"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden">
                    <div className="border-t border-white/10 overflow-x-auto max-h-[400px]">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
                          <tr className="text-left text-slate-300">
                            <th className="px-4 py-2.5">Fecha</th>
                            <th className="px-4 py-2.5">Asesor</th>
                            <th className="px-4 py-2.5">Zona</th>
                            <th className="px-4 py-2.5">Plan</th>
                            <th className="px-4 py-2.5">Estado</th>
                            <th className="px-4 py-2.5">Nominal</th>
                            <th className="px-4 py-2.5">Aprobado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((row, i) => (
                            <motion.tr key={row.id}
                              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.006 }}
                              className="border-t border-slate-800/60 hover:bg-slate-800/40">
                              <td className="px-4 py-2">{row.sale_date}</td>
                              <td className="px-4 py-2">{row.advisor_name}</td>
                              <td className="px-4 py-2">{row.zone_name}</td>
                              <td className="px-4 py-2">{row.plan_name || '-'}</td>
                              <td className="px-4 py-2">{row.status_name || '-'}</td>
                              <td className="px-4 py-2 font-medium text-cyan">{money(row.sale_amount)}</td>
                              <td className="px-4 py-2 text-green-400">{money(row.approved_amount)}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
