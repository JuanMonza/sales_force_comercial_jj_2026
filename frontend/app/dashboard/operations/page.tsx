'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type VersionRow = {
  entity_name: string;
  record_id: string;
  version_no: number;
  change_reason: string;
  created_at: string;
  changed_by: string | null;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OperationsPage() {
  const user = getUser();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budgetId, setBudgetId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [changeReason, setChangeReason] = useState('Ajuste de negocio');
  const [recordId, setRecordId] = useState('');
  const [entityName, setEntityName] = useState<'sales' | 'users' | 'budgets'>('sales');
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const queryMonth = useMemo(() => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    return params.toString();
  }, [month]);

  const runWithFeedback = async (callback: () => Promise<void>, okMessage: string) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await callback();
      setMessage(okMessage);
    } catch (err: any) {
      setError(err.message || 'Operacion fallida');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (kind: 'csv' | 'xlsx') => {
    const token = getToken();
    if (!token) return;
    const file = kind === 'csv' ? csvFile : xlsxFile;
    if (!file) {
      setError(`Selecciona archivo ${kind.toUpperCase()}`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    await apiFetch(`/imports/sales-${kind}`, {
      method: 'POST',
      token,
      body: formData
    });
  };

  const exportFile = async (kind: 'xlsx' | 'pdf') => {
    const token = getToken();
    if (!token) return;
    const endpoint = kind === 'xlsx' ? '/exports/sales.xlsx' : '/exports/sales-report.pdf';
    const blob = await apiFetchBlob(`${endpoint}${queryMonth ? `?${queryMonth}` : ''}`, { token });
    downloadBlob(blob, `reporte_ventas_${month || new Date().toISOString().slice(0, 7)}.${kind}`);
  };

  const updateBudget = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !isAdmin) return;

    await runWithFeedback(async () => {
      await apiFetch(`/business-edits/budgets/${budgetId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          targetAmount: targetAmount ? Number(targetAmount) : undefined,
          targetCount: targetCount ? Number(targetCount) : undefined,
          changeReason
        })
      });
    }, 'Presupuesto actualizado con versionado');
  };

  const fetchVersions = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !isAdmin) return;

    await runWithFeedback(async () => {
      const params = new URLSearchParams({
        entityName,
        recordId,
        limit: '80'
      });
      const data = await apiFetch<VersionRow[]>(`/business-edits/record-versions?${params.toString()}`, { token });
      setVersions(data);
    }, 'Historial cargado');
  };

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card p-5"
      >
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Import / Export empresarial</p>
        <h1 className="text-3xl font-semibold mt-1">Operaciones de negocio</h1>
        <p className="text-sm text-slate-300 mt-2">
          Carga CSV/XLSX, exportacion PDF/Excel, jobs nocturnos y edicion global segura con trazabilidad.
        </p>
      </motion.header>

      {message ? <p className="text-mint text-sm">{message}</p> : null}
      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm">Procesando...</p> : null}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="glass-card p-4 space-y-3"
        >
          <h2 className="font-semibold text-lg">Importacion masiva</h2>
          <div className="space-y-2">
            <label className="text-xs text-slate-300 block">CSV de ventas</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm"
            />
            <button
              className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2"
              onClick={() => runWithFeedback(() => uploadFile('csv'), 'CSV importado correctamente')}
            >
              Importar CSV
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300 block">Excel (.xlsx) de ventas</label>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setXlsxFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm"
            />
            <button
              className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2"
              onClick={() => runWithFeedback(() => uploadFile('xlsx'), 'XLSX importado correctamente')}
            >
              Importar XLSX
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="glass-card p-4 space-y-3"
        >
          <h2 className="font-semibold text-lg">Exportacion de reportes</h2>
          <label className="text-xs text-slate-300 block">Mes base</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-mint text-ink font-semibold px-4 py-2"
              onClick={() => runWithFeedback(() => exportFile('xlsx'), 'Excel generado')}
            >
              Exportar Excel
            </button>
            <button
              className="rounded-lg border border-mint/45 text-mint font-semibold px-4 py-2"
              onClick={() => runWithFeedback(() => exportFile('pdf'), 'PDF generado')}
            >
              Exportar PDF
            </button>
          </div>

          {isAdmin ? (
            <button
              className="rounded-lg border border-cyan/40 text-cyan px-4 py-2"
              onClick={() =>
                runWithFeedback(
                  () => {
                    const token = getToken();
                    if (!token) return Promise.resolve();
                    return apiFetch('/jobs/nightly-run', { method: 'POST', token }).then(() => undefined);
                  },
                  'Batch nocturno ejecutado'
                )
              }
            >
              Ejecutar batch nocturno (manual)
            </button>
          ) : null}
        </motion.div>
      </section>

      {isAdmin ? (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="glass-card p-4 space-y-3">
            <h2 className="font-semibold text-lg">Edicion global segura de presupuestos</h2>
            <form onSubmit={updateBudget} className="space-y-2">
              <input
                required
                value={budgetId}
                onChange={(e) => setBudgetId(e.target.value)}
                placeholder="Budget ID"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              />
              <input
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Nuevo targetAmount"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              />
              <input
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="Nuevo targetCount"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              />
              <input
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Razon del cambio"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              />
              <button type="submit" className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2">
                Actualizar presupuesto
              </button>
            </form>
          </div>

          <div className="glass-card p-4 space-y-3">
            <h2 className="font-semibold text-lg">Versionado por registro</h2>
            <form onSubmit={fetchVersions} className="space-y-2">
              <select
                value={entityName}
                onChange={(e) => setEntityName(e.target.value as 'sales' | 'users' | 'budgets')}
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              >
                <option value="sales">sales</option>
                <option value="users">users</option>
                <option value="budgets">budgets</option>
              </select>
              <input
                required
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                placeholder="Record ID"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              />
              <button type="submit" className="rounded-lg border border-cyan/40 text-cyan px-4 py-2">
                Consultar historial
              </button>
            </form>

            <div className="max-h-[280px] overflow-auto rounded-lg border border-slate-700">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-900/90">
                  <tr className="text-left text-slate-300">
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Razon</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((row) => (
                    <tr key={`${row.record_id}-${row.version_no}`} className="border-t border-slate-800/70">
                      <td className="px-3 py-2">{row.version_no}</td>
                      <td className="px-3 py-2">{row.change_reason}</td>
                      <td className="px-3 py-2">{row.created_at.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                  {versions.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={3}>
                        Sin historial consultado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
