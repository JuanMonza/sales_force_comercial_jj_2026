'use client';

import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

const REC_PAGE_SIZE = 8;

function semaphoreClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'text-slate-400';
  if (v >= 100) return 'font-bold text-cyan-400';
  if (v >= 80)  return 'font-bold text-green-400';
  if (v >= 60)  return 'font-bold text-yellow-400';
  if (v >= 40)  return 'font-bold text-orange-400';
  return 'font-bold text-rose-400';
}
function semaphoreEmoji(_v: number | null | undefined): string {
  return '';
}

type Forecast = {
  month: string;
  scopeType: string;
  scopeId: string | null;
  observedNominal: number;
  forecastNominal: number;
  projectedGap: number;
  confidenceScore: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  previousMonthNominal: number;
  variationVsPreviousMonthPct: number | null;
  upperBand: number;
  lowerBand: number;
  modelVersion: string;
};

type Anomaly = {
  advisorId: string;
  advisorName: string;
  regional: string;
  zona: string;
  day: string;
  nominal: number;
  average: number;
  stdDev: number;
  zScore: number;
};

type AnomalyResponse = {
  month: string;
  threshold: number;
  total: number;
  anomalies: Anomaly[];
};

type RecommendationRow = {
  advisorName: string;
  zona: string;
  regional: string;
  porcentajeCumplimiento: number;
  nosFalta: number;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  action: string;
  reason: string;
};

type RecommendationResponse = {
  month: string;
  forecast: Forecast;
  anomalyCount: number;
  globalActions: string[];
  advisorActions: RecommendationRow[];
};

function money(value: number) {
  return `$${Number(value).toLocaleString('es-CO')}`;
}

export default function AiPage() {
  const user = getUser();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recPage, setRecPage] = useState(1);

  const loadData = async (selectedMonth: string) => {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    const suffix = params.toString();

    setLoading(true);
    setError('');
    try {
      const [forecastRes, anomaliesRes, recRes] = await Promise.all([
        apiFetch<Forecast>(`/ai/forecast?${suffix}`, { token }),
        apiFetch<AnomalyResponse>(`/ai/anomalies?${suffix}`, { token }),
        apiFetch<RecommendationResponse>(`/ai/recommendations?${suffix}`, { token })
      ]);
      setForecast(forecastRes);
      setAnomalies(anomaliesRes);
      setRecommendations(recRes);
      setRecPage(1);
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar IA comercial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(month);
  }, []);

  const onApply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadData(month);
  };

  const onSnapshot = async () => {
    const token = getToken();
    if (!token) return;
    setError('');
    setMessage('');
    try {
      await apiFetch(`/ai/forecast/snapshot?month=${month}`, {
        method: 'POST',
        token
      });
      setMessage('Snapshot IA persistido correctamente');
    } catch (err: any) {
      setError(err.message || 'No fue posible persistir snapshot');
    }
  };

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card p-5"
      >
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">IA real</p>
        <h1 className="text-3xl font-semibold mt-1">Forecast, anomalias y recomendaciones</h1>
        <p className="text-sm text-slate-300 mt-2">
          Modelo de forecast por regresion lineal, deteccion de outliers por z-score y sugerencias accionables.
        </p>
      </motion.header>

      <form onSubmit={onApply} className="glass-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Mes analisis</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
        </div>
        <button className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2">Actualizar IA</button>
        {user?.role !== 'ASESOR' ? (
          <button
            type="button"
            className="rounded-lg border border-cyan/40 text-cyan px-4 py-2"
            onClick={onSnapshot}
          >
            Persistir snapshot
          </button>
        ) : null}
      </form>

      {message ? <p className="text-mint text-sm">{message}</p> : null}
      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm">Cargando...</p> : null}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-[0.12em]">Forecast cierre</p>
          <p className="text-2xl font-semibold mt-1">{money(forecast?.forecastNominal ?? 0)}</p>
          <p className="text-xs text-slate-400 mt-2">Observado: {money(forecast?.observedNominal ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Banda: {money(forecast?.lowerBand ?? 0)} → {money(forecast?.upperBand ?? 0)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-[0.12em]">Confianza modelo</p>
          <p className={`text-2xl font-semibold mt-1 ${semaphoreClass(forecast?.confidenceScore)}`}>
            {semaphoreEmoji(forecast?.confidenceScore)} {forecast?.confidenceScore ?? 0}%
          </p>
          <p className="text-xs text-slate-400 mt-2">Versión: {forecast?.modelVersion ?? '-'}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-[0.12em]">Tendencia</p>
          <p className="text-2xl font-semibold mt-1">
            {forecast?.trend === 'UP' ? '▲' : forecast?.trend === 'DOWN' ? '▼' : '—'} {forecast?.trend ?? '-'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Vs mes anterior: {forecast?.variationVsPreviousMonthPct?.toFixed(2) ?? '-'}%
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-2">Anomalias detectadas</h2>
          <p className="text-sm text-slate-300 mb-2">Total: {anomalies?.total ?? 0}</p>
          <div className="max-h-[330px] overflow-auto rounded-lg border border-slate-700">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-900/90">
                <tr className="text-left text-slate-300">
                  <th className="px-3 py-2">Asesor</th>
                  <th className="px-3 py-2">Zona</th>
                  <th className="px-3 py-2">Dia</th>
                  <th className="px-3 py-2">Nominal</th>
                  <th className="px-3 py-2">Z-score</th>
                </tr>
              </thead>
              <tbody>
                {(anomalies?.anomalies ?? []).slice(0, 120).map((row) => (
                  <tr key={`${row.advisorId}-${row.day}`} className="border-t border-slate-800/70">
                    <td className="px-3 py-2">{row.advisorName}</td>
                    <td className="px-3 py-2">{row.zona}</td>
                    <td className="px-3 py-2">{row.day}</td>
                    <td className="px-3 py-2">{money(row.nominal)}</td>
                    <td className="px-3 py-2">{row.zScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold mb-2">Recomendaciones automaticas</h2>
          <div className="space-y-2">
            {(recommendations?.globalActions ?? []).map((item, idx) => (
              <div key={`${idx}-${item}`} className="rounded-lg border border-cyan/20 bg-cyan/5 px-3 py-2 text-sm">
                {item}
              </div>
            ))}
            {(recommendations?.globalActions ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">Sin recomendaciones globales.</p>
            ) : null}
          </div>

          <h3 className="font-semibold mt-4 mb-2">Acciones por asesor</h3>
          <div className="space-y-2">
            {(recommendations?.advisorActions ?? [])
              .slice((recPage - 1) * REC_PAGE_SIZE, recPage * REC_PAGE_SIZE)
              .map((row, idx) => (
              <div key={`${row.advisorName}-${idx}`} className="rounded-xl border border-slate-700/60 p-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium text-sm">{row.advisorName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${semaphoreClass(row.porcentajeCumplimiento)}`}>
                      {semaphoreEmoji(row.porcentajeCumplimiento)} {row.porcentajeCumplimiento.toFixed(1)}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      row.priority === 'ALTA'
                        ? 'bg-rose/20 text-rose border-rose/30'
                        : row.priority === 'MEDIA'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                      {row.priority}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      row.porcentajeCumplimiento >= 100 ? 'bg-cyan-400' :
                      row.porcentajeCumplimiento >= 80  ? 'bg-green-400' :
                      row.porcentajeCumplimiento >= 60  ? 'bg-yellow-400' :
                      row.porcentajeCumplimiento >= 40  ? 'bg-orange-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${Math.min(row.porcentajeCumplimiento, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-300 mt-1.5">{row.reason}</p>
                <p className="text-xs text-slate-400 mt-1">{row.zona} · {row.regional}</p>
                <p className="text-xs mt-1.5 text-white/80">→ {row.action}</p>
              </div>
            ))}
          </div>

          {/* Paginación recomendaciones */}
          {(recommendations?.advisorActions?.length ?? 0) > REC_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                {recPage}·{Math.ceil((recommendations?.advisorActions?.length ?? 0) / REC_PAGE_SIZE)} ·{' '}
                {recommendations?.advisorActions?.length} asesores
              </p>
              <div className="flex gap-2">
                <button disabled={recPage === 1} onClick={() => setRecPage((p) => p - 1)}
                  className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">‹</button>
                <button
                  disabled={recPage >= Math.ceil((recommendations?.advisorActions?.length ?? 0) / REC_PAGE_SIZE)}
                  onClick={() => setRecPage((p) => p + 1)}
                  className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">›</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
