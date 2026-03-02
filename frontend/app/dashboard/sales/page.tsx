'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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

function money(v: number | string) {
  return `$${Number(v).toLocaleString('es-CO')}`;
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
      query.set('limit', '500');
      const data = await apiFetch<SaleRow[]>(`/sales?${query.toString()}`, { token });
      setRows(data);
      // Abrir todos por defecto
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
        ? r.advisor_name.toLowerCase().includes(advisorFilter.toLowerCase())
        : true;
      const byCoord = coordinatorFilter
        ? (r.coordinator_name ?? '').toLowerCase().includes(coordinatorFilter.toLowerCase())
        : true;
      return byAdvisor && byCoord;
    });
  }, [rows, advisorFilter, coordinatorFilter]);

  // Agrupar por regional
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

  const toggleRegional = (name: string) => {
    setOpenRegionals((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-4">
      <header className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ventas por período</h1>
          <p className="text-slate-300 text-sm mt-1">
            Vista agrupada por regional con acordeón. Filtra por fechas o nombre de asesor/coordinador.
          </p>
        </div>
        {/* Selector tipo de gráfica */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-700">
          {CHART_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartType === type
                  ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {type === 'Barras' ? 'Barras' : type === 'Cilindro' ? 'Cilindros' : 'Velas'}
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
        <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setAdvisorFilter(''); setCoordinatorFilter(''); fetchSales(); }}
          className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300">
          Limpiar
        </button>
      </form>

      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm animate-pulse">Cargando ventas...</p> : null}

      {/* KPI total */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total ventas</p>
          <p className="text-2xl font-bold text-white mt-1">{filtered.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Nominal total</p>
          <p className="text-2xl font-bold text-cyan mt-1">
            {money(filtered.reduce((sum, r) => sum + Number(r.sale_amount), 0))}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Regionales activas</p>
          <p className="text-2xl font-bold text-white mt-1">{regionals.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Aprobado total</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {money(filtered.reduce((sum, r) => sum + Number(r.approved_amount), 0))}
          </p>
        </div>
      </div>

      {/* Acordeón por regional */}
      <div className="space-y-3">
        {regionals.map((regional, ridx) => {
          const sales = byRegional[regional];
          const isOpen = !!openRegionals[regional];
          const nominal = sales.reduce((s, r) => s + Number(r.sale_amount), 0);
          const pct = (sales.length / maxRegionalSales) * 100;

          return (
            <motion.div
              key={regional}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ridx * 0.05 }}
              className="glass-card overflow-hidden"
            >
              {/* Header regional */}
              <button
                onClick={() => toggleRegional(regional)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
              >
                <motion.span
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="text-cyan text-lg"
                >
                  ▶
                </motion.span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">{regional}</p>
                  <div className="mt-1">
                    <ChartBar pct={pct} color={chartType === 'Cilindro' ? '#6ef2c8' : '#23c7d9'} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-cyan">{sales.length} ventas</p>
                  <p className="text-xs text-slate-400">{money(nominal)}</p>
                </div>
                <span className={`ml-2 text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>

              {/* Tabla desplegable */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/10 overflow-x-auto max-h-[400px]">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
                          <tr className="text-left text-slate-300">
                            <th className="px-4 py-2.5">Fecha</th>
                            <th className="px-4 py-2.5">Asesor</th>
                            <th className="px-4 py-2.5">Zona</th>
                            <th className="px-4 py-2.5">Plan</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Nominal</th>
                            <th className="px-4 py-2.5">Aprobado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((row, i) => (
                            <motion.tr
                              key={row.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.008 }}
                              className="border-t border-slate-800/60 hover:bg-slate-800/40"
                            >
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
