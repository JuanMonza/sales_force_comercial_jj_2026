'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SalesTable } from '@/components/SalesTable';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function SalesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
      query.set('limit', '200');
      const data = await apiFetch<any[]>(`/sales?${query.toString()}`, { token });
      setRows(data);
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const onApply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchSales({ startDate, endDate });
  };

  return (
    <div className="space-y-4">
      <header className="glass-card p-5">
        <h1 className="text-2xl font-semibold">Ventas por periodo</h1>
        <p className="text-slate-300 text-sm mt-1">Consulta detallada de ventas con filtros de fecha.</p>
      </header>

      <form onSubmit={onApply} className="glass-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Fecha inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Fecha fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
          />
        </div>
        <button type="submit" className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2 hover:brightness-110">
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={() => {
            setStartDate('');
            setEndDate('');
            fetchSales();
          }}
          className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300"
        >
          Limpiar
        </button>
      </form>

      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm">Cargando...</p> : null}
      <SalesTable rows={rows} />
    </div>
  );
}

