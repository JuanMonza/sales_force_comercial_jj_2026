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
};

export function SalesTable({ rows }: { rows: SaleRow[] }) {
  return (
    <div className="glass-card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
          <tr className="text-left text-slate-300">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Asesor</th>
            <th className="px-4 py-3">Regional</th>
            <th className="px-4 py-3">Zona</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Nominal</th>
            <th className="px-4 py-3">Aprobado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
              <td className="px-4 py-3">{row.sale_date}</td>
              <td className="px-4 py-3">{row.advisor_name}</td>
              <td className="px-4 py-3">{row.regional_name}</td>
              <td className="px-4 py-3">{row.zone_name}</td>
              <td className="px-4 py-3">{row.plan_name || '-'}</td>
              <td className="px-4 py-3">{row.status_name || '-'}</td>
              <td className="px-4 py-3">${Number(row.sale_amount).toLocaleString('es-CO')}</td>
              <td className="px-4 py-3">${Number(row.approved_amount).toLocaleString('es-CO')}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                No hay ventas para los filtros aplicados.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

