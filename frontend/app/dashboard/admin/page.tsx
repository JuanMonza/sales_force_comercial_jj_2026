'use client';

import { FormEvent, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

/* ═══════════════════════════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════════════════════════ */
type Regional = { id: string; code: string; name: string; created_at: string };
type Zone = { id: string; code: string; name: string; regional_id: string; regional_name: string };
type Plan = { id: string; code: string; name: string; base_price: string | number; is_active: boolean };
type Service = { id: string; code: string; name: string; price: string | number; is_active: boolean };
type Status = {
  id: string; code: string; name: string;
  is_final: boolean; is_approved: boolean; is_active: boolean;
};
type Budget = {
  id: string; month_date: string; scope_type: string;
  scope_id: string | null; scope_label: string | null;
  target_amount: string | number; target_count: number;
  target_120_amount: string | number; approved_target_amount: string | number;
};

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════════ */
const money = (v: number | string) => `$${Number(v).toLocaleString('es-CO')}`;

const TABS = ['Regionales', 'Zonas', 'Planes', 'Servicios', 'Estados', 'Presupuestos'] as const;
type Tab = typeof TABS[number];

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const user = getUser();
  const token = getToken();
  const [tab, setTab] = useState<Tab>('Regionales');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  /* ── Estado de catálogos ───────────────────────────────────── */
  const [regionals, setRegionals] = useState<Regional[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const notify = (m: string, isErr = false) => {
    if (isErr) { setErr(m); setMsg(''); }
    else { setMsg(m); setErr(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 3500);
  };

  /* ── Carga inicial ─────────────────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<Regional[]>('/catalogs/regionals', { token }),
      apiFetch<Zone[]>('/catalogs/zones', { token }),
      apiFetch<Plan[]>('/catalogs/plans', { token }),
      apiFetch<Service[]>('/catalogs/services', { token }),
      apiFetch<Status[]>('/catalogs/statuses', { token }),
      apiFetch<Budget[]>('/catalogs/budgets', { token }),
    ]).then(([r, z, p, s, st, b]) => {
      setRegionals(r); setZones(z); setPlans(p);
      setServices(s); setStatuses(st); setBudgets(b);
    }).catch((e) => notify(e.message, true));
  }, [token]);

  if (user?.role !== 'ADMINISTRADOR') {
    return <p className="text-rose-400 p-6">Acceso restringido a Administradores.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-lg font-semibold mb-1">Administración de Jerarquía y Catálogos</h1>
        <p className="text-slate-400 text-sm">Gestión completa de tablas maestras del sistema.</p>
      </div>

      {/* Mensajes */}
      <AnimatePresence>
        {(msg || err) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-lg px-4 py-3 text-sm ${err ? 'bg-rose/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}
          >
            {msg || err}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? 'bg-cyan/30 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Secciones ─────────────────────────────────────────────── */}
      {tab === 'Regionales' && (
        <RegionalesSection
          token={token!} rows={regionals} setRows={setRegionals} notify={notify}
        />
      )}
      {tab === 'Zonas' && (
        <ZonasSection
          token={token!} rows={zones} setRows={setZones} regionals={regionals} notify={notify}
        />
      )}
      {tab === 'Planes' && (
        <PlanesSection
          token={token!} rows={plans} setRows={setPlans} notify={notify}
        />
      )}
      {tab === 'Servicios' && (
        <ServiciosSection
          token={token!} rows={services} setRows={setServices} notify={notify}
        />
      )}
      {tab === 'Estados' && (
        <EstadosSection
          token={token!} rows={statuses} setRows={setStatuses} notify={notify}
        />
      )}
      {tab === 'Presupuestos' && (
        <PresupuestosSection
          token={token!} rows={budgets} setRows={setBudgets} regionals={regionals} zones={zones} notify={notify}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECCIÓN: REGIONALES
═══════════════════════════════════════════════════════════════════════════════ */
function RegionalesSection({
  token, rows, setRows, notify
}: { token: string; rows: Regional[]; setRows: (r: Regional[]) => void; notify: (m: string, e?: boolean) => void }) {
  const [editing, setEditing] = useState<Regional | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const openNew = () => { setEditing(null); setCode(''); setName(''); };
  const openEdit = (r: Regional) => { setEditing(r); setCode(r.code); setName(r.name); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await apiFetch<Regional>(`/catalogs/regionals/${editing.id}`, {
          method: 'PATCH', token, body: JSON.stringify({ code, name })
        });
        setRows(rows.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
        notify('Regional actualizada');
      } else {
        const created = await apiFetch<Regional>('/catalogs/regionals', {
          method: 'POST', token, body: JSON.stringify({ code, name })
        });
        setRows([...rows, created]);
        notify('Regional creada');
      }
      setEditing(null); setCode(''); setName('');
    } catch (ex: any) { notify(ex.message, true); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta regional?')) return;
    try {
      await apiFetch(`/catalogs/regionals/${id}`, { method: 'DELETE', token });
      setRows(rows.filter((r) => r.id !== id));
      notify('Regional eliminada');
    } catch (ex: any) { notify(ex.message, true); }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-base">Regionales</h2>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="col-span-1 input-field" placeholder="Código" value={code}
          onChange={(e) => setCode(e.target.value)} required
        />
        <input
          className="col-span-1 sm:col-span-1 input-field" placeholder="Nombre" value={name}
          onChange={(e) => setName(e.target.value)} required
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            {editing ? 'Actualizar' : 'Crear'}
          </button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={openNew}>Cancelar</button>
          )}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="pb-2 pr-4">Código</th>
              <th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-4 font-mono text-cyan-400">{r.code}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-xs btn-secondary">Editar</button>
                  <button onClick={() => del(r.id)} className="text-xs btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-slate-500">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECCIÓN: ZONAS
═══════════════════════════════════════════════════════════════════════════════ */
function ZonasSection({
  token, rows, setRows, regionals, notify
}: {
  token: string; rows: Zone[]; setRows: (r: Zone[]) => void;
  regionals: Regional[]; notify: (m: string, e?: boolean) => void;
}) {
  const [editing, setEditing] = useState<Zone | null>(null);
  const [regionalId, setRegionalId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const openNew = () => { setEditing(null); setCode(''); setName(''); setRegionalId(''); };
  const openEdit = (z: Zone) => { setEditing(z); setCode(z.code); setName(z.name); setRegionalId(z.regional_id); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await apiFetch<Zone>(`/catalogs/zones/${editing.id}`, {
          method: 'PATCH', token, body: JSON.stringify({ regional_id: regionalId, code, name })
        });
        setRows(rows.map((z) => z.id === updated.id ? { ...z, ...updated } : z));
        notify('Zona actualizada');
      } else {
        const created = await apiFetch<Zone>('/catalogs/zones', {
          method: 'POST', token, body: JSON.stringify({ regional_id: regionalId, code, name })
        });
        setRows([...rows, created]);
        notify('Zona creada');
      }
      openNew();
    } catch (ex: any) { notify(ex.message, true); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    try {
      await apiFetch(`/catalogs/zones/${id}`, { method: 'DELETE', token });
      setRows(rows.filter((z) => z.id !== id));
      notify('Zona eliminada');
    } catch (ex: any) { notify(ex.message, true); }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-base">Zonas</h2>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          className="input-field" value={regionalId} onChange={(e) => setRegionalId(e.target.value)} required
        >
          <option value="">— Regional —</option>
          {regionals.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input className="input-field" placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input className="input-field" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">{editing ? 'Actualizar' : 'Crear'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={openNew}>Cancelar</button>}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="pb-2 pr-4">Código</th>
              <th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Regional</th>
              <th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((z) => (
              <tr key={z.id}>
                <td className="py-2 pr-4 font-mono text-cyan-400">{z.code}</td>
                <td className="py-2 pr-4">{z.name}</td>
                <td className="py-2 pr-4 text-slate-400">{z.regional_name}</td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEdit(z)} className="text-xs btn-secondary">Editar</button>
                  <button onClick={() => del(z.id)} className="text-xs btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-500">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECCIÓN: PLANES
═══════════════════════════════════════════════════════════════════════════════ */
function PlanesSection({
  token, rows, setRows, notify
}: { token: string; rows: Plan[]; setRows: (r: Plan[]) => void; notify: (m: string, e?: boolean) => void }) {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);

  const openNew = () => { setEditing(null); setCode(''); setName(''); setPrice(''); setActive(true); };
  const openEdit = (p: Plan) => { setEditing(p); setCode(p.code); setName(p.name); setPrice(String(p.base_price)); setActive(p.is_active); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { code, name, base_price: Number(price), is_active: active };
    try {
      if (editing) {
        const updated = await apiFetch<Plan>(`/catalogs/plans/${editing.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
        setRows(rows.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
        notify('Plan actualizado');
      } else {
        const created = await apiFetch<Plan>('/catalogs/plans', { method: 'POST', token, body: JSON.stringify(body) });
        setRows([...rows, created]);
        notify('Plan creado');
      }
      openNew();
    } catch (ex: any) { notify(ex.message, true); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este plan?')) return;
    try {
      await apiFetch(`/catalogs/plans/${id}`, { method: 'DELETE', token });
      setRows(rows.filter((p) => p.id !== id));
      notify('Plan eliminado');
    } catch (ex: any) { notify(ex.message, true); }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-base">Planes</h2>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <input className="input-field" placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input className="input-field sm:col-span-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input-field" type="number" min="0" step="0.01" placeholder="Precio base" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-sm text-slate-400 whitespace-nowrap">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
          </label>
          <button type="submit" className="btn-primary flex-1">{editing ? '✓' : '+'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={openNew}>✕</button>}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="pb-2 pr-4">Código</th><th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Precio base</th><th className="pb-2 pr-4">Activo</th>
              <th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-4 font-mono text-cyan-400">{p.code}</td>
                <td className="py-2 pr-4">{p.name}</td>
                <td className="py-2 pr-4 text-emerald-400">{money(p.base_price)}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                    {p.is_active ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEdit(p)} className="text-xs btn-secondary">Editar</button>
                  <button onClick={() => del(p.id)} className="text-xs btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-500">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECCIÓN: SERVICIOS
═══════════════════════════════════════════════════════════════════════════════ */
function ServiciosSection({
  token, rows, setRows, notify
}: { token: string; rows: Service[]; setRows: (r: Service[]) => void; notify: (m: string, e?: boolean) => void }) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);

  const openNew = () => { setEditing(null); setCode(''); setName(''); setPrice(''); setActive(true); };
  const openEdit = (s: Service) => { setEditing(s); setCode(s.code); setName(s.name); setPrice(String(s.price)); setActive(s.is_active); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { code, name, price: Number(price), is_active: active };
    try {
      if (editing) {
        const updated = await apiFetch<Service>(`/catalogs/services/${editing.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
        setRows(rows.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
        notify('Servicio actualizado');
      } else {
        const created = await apiFetch<Service>('/catalogs/services', { method: 'POST', token, body: JSON.stringify(body) });
        setRows([...rows, created]);
        notify('Servicio creado');
      }
      openNew();
    } catch (ex: any) { notify(ex.message, true); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      await apiFetch(`/catalogs/services/${id}`, { method: 'DELETE', token });
      setRows(rows.filter((s) => s.id !== id));
      notify('Servicio eliminado');
    } catch (ex: any) { notify(ex.message, true); }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-base">Servicios Adicionales</h2>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <input className="input-field" placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input className="input-field sm:col-span-2" placeholder="Nombre del servicio" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input-field" type="number" min="0" step="0.01" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-sm text-slate-400 whitespace-nowrap">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
          </label>
          <button type="submit" className="btn-primary flex-1">{editing ? '✓' : '+'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={openNew}>✕</button>}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="pb-2 pr-4">Código</th><th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Precio</th><th className="pb-2 pr-4">Activo</th>
              <th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4 font-mono text-cyan-400">{s.code}</td>
                <td className="py-2 pr-4">{s.name}</td>
                <td className="py-2 pr-4 text-emerald-400">{money(s.price)}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                    {s.is_active ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEdit(s)} className="text-xs btn-secondary">Editar</button>
                  <button onClick={() => del(s.id)} className="text-xs btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-500">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECCIÓN: ESTADOS (status_catalog)
═══════════════════════════════════════════════════════════════════════════════ */
function EstadosSection({
  token, rows, setRows, notify
}: { token: string; rows: Status[]; setRows: (r: Status[]) => void; notify: (m: string, e?: boolean) => void }) {
  const [editing, setEditing] = useState<Status | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [active, setActive] = useState(true);

  const openNew = () => { setEditing(null); setCode(''); setName(''); setIsFinal(false); setIsApproved(false); setActive(true); };
  const openEdit = (s: Status) => {
    setEditing(s); setCode(s.code); setName(s.name);
    setIsFinal(s.is_final); setIsApproved(s.is_approved); setActive(s.is_active);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { code, name, is_final: isFinal, is_approved: isApproved, is_active: active };
    try {
      if (editing) {
        const updated = await apiFetch<Status>(`/catalogs/statuses/${editing.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
        setRows(rows.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
        notify('Estado actualizado');
      } else {
        const created = await apiFetch<Status>('/catalogs/statuses', { method: 'POST', token, body: JSON.stringify(body) });
        setRows([...rows, created]);
        notify('Estado creado');
      }
      openNew();
    } catch (ex: any) { notify(ex.message, true); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este estado?')) return;
    try {
      await apiFetch(`/catalogs/statuses/${id}`, { method: 'DELETE', token });
      setRows(rows.filter((s) => s.id !== id));
      notify('Estado eliminado');
    } catch (ex: any) { notify(ex.message, true); }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-base">Estados de Venta</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input-field" placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
          <input className="input-field sm:col-span-2" placeholder="Nombre del estado" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-wrap gap-5 items-center">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
            Estado final (cierra flujo)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={isApproved} onChange={(e) => setIsApproved(e.target.checked)} />
            Implica aprobación
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Activo
          </label>
          <button type="submit" className="btn-primary ml-auto">{editing ? 'Actualizar' : 'Crear Estado'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={openNew}>Cancelar</button>}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="pb-2 pr-4">Código</th><th className="pb-2 pr-4">Nombre</th>
              <th className="pb-2 pr-4">Final</th><th className="pb-2 pr-4">Aprueba</th>
              <th className="pb-2 pr-4">Activo</th><th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4 font-mono text-cyan-400">{s.code}</td>
                <td className="py-2 pr-4">{s.name}</td>
                <td className="py-2 pr-4">{s.is_final ? '✓' : '—'}</td>
                <td className="py-2 pr-4">{s.is_approved ? '✓' : '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                    {s.is_active ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEdit(s)} className="text-xs btn-secondary">Editar</button>
                  <button onClick={() => del(s.id)} className="text-xs btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-500">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECCIÓN: PRESUPUESTOS
═══════════════════════════════════════════════════════════════════════════════ */
const SCOPE_TYPES = ['TENANT', 'REGIONAL', 'ZONE', 'ADVISOR'] as const;

function PresupuestosSection({
  token, rows, setRows, regionals, zones, notify
}: {
  token: string; rows: Budget[]; setRows: (r: Budget[]) => void;
  regionals: Regional[]; zones: Zone[];
  notify: (m: string, e?: boolean) => void;
}) {
  const [editing, setEditing] = useState<Budget | null>(null);
  const [monthDate, setMonthDate] = useState('');
  const [scopeType, setScopeType] = useState<string>('TENANT');
  const [scopeId, setScopeId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetCount, setTargetCount] = useState('0');
  const [target120, setTarget120] = useState('0');
  const [approvedTarget, setApprovedTarget] = useState('0');

  const openNew = () => {
    setEditing(null); setMonthDate(''); setScopeType('TENANT'); setScopeId('');
    setTargetAmount(''); setTargetCount('0'); setTarget120('0'); setApprovedTarget('0');
  };
  const openEdit = (b: Budget) => {
    setEditing(b);
    setMonthDate(b.month_date.substring(0, 7));
    setScopeType(b.scope_type); setScopeId(b.scope_id ?? '');
    setTargetAmount(String(b.target_amount)); setTargetCount(String(b.target_count));
    setTarget120(String(b.target_120_amount)); setApprovedTarget(String(b.approved_target_amount));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      month_date: monthDate + '-01',
      scope_type: scopeType,
      scope_id: scopeId || undefined,
      target_amount: Number(targetAmount),
      target_count: Number(targetCount),
      target_120_amount: Number(target120),
      approved_target_amount: Number(approvedTarget),
    };
    try {
      if (editing) {
        const updated = await apiFetch<Budget>(`/catalogs/budgets/${editing.id}`, {
          method: 'PATCH', token,
          body: JSON.stringify({
            target_amount: body.target_amount, target_count: body.target_count,
            target_120_amount: body.target_120_amount, approved_target_amount: body.approved_target_amount
          })
        });
        setRows(rows.map((b) => b.id === updated.id ? { ...b, ...updated } : b));
        notify('Presupuesto actualizado');
      } else {
        const created = await apiFetch<Budget>('/catalogs/budgets', { method: 'POST', token, body: JSON.stringify(body) });
        setRows([...rows, created]);
        notify('Presupuesto creado');
      }
      openNew();
    } catch (ex: any) { notify(ex.message, true); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    try {
      await apiFetch(`/catalogs/budgets/${id}`, { method: 'DELETE', token });
      setRows(rows.filter((b) => b.id !== id));
      notify('Presupuesto eliminado');
    } catch (ex: any) { notify(ex.message, true); }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-base">Presupuestos Mensuales</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Mes</label>
            <input
              type="month" className="input-field w-full"
              value={monthDate} onChange={(e) => setMonthDate(e.target.value)} required={!editing}
              disabled={!!editing}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Alcance</label>
            <select className="input-field w-full" value={scopeType} onChange={(e) => { setScopeType(e.target.value); setScopeId(''); }} disabled={!!editing}>
              {SCOPE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {scopeType === 'REGIONAL' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Regional</label>
              <select className="input-field w-full" value={scopeId} onChange={(e) => setScopeId(e.target.value)} required disabled={!!editing}>
                <option value="">— Seleccionar —</option>
                {regionals.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {scopeType === 'ZONE' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Zona</label>
              <select className="input-field w-full" value={scopeId} onChange={(e) => setScopeId(e.target.value)} required disabled={!!editing}>
                <option value="">— Seleccionar —</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.regional_name})</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Monto objetivo</label>
            <input type="number" min="0" step="0.01" className="input-field w-full" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Cantidad (ventas)</label>
            <input type="number" min="0" className="input-field w-full" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Objetivo 120%</label>
            <input type="number" min="0" step="0.01" className="input-field w-full" value={target120} onChange={(e) => setTarget120(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Objetivo aprobado</label>
            <input type="number" min="0" step="0.01" className="input-field w-full" value={approvedTarget} onChange={(e) => setApprovedTarget(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">{editing ? 'Actualizar' : 'Crear Presupuesto'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={openNew}>Cancelar</button>}
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="pb-2 pr-3">Mes</th><th className="pb-2 pr-3">Alcance</th>
              <th className="pb-2 pr-3">Entidad</th><th className="pb-2 pr-3">Monto obj.</th>
              <th className="pb-2 pr-3">Cant.</th><th className="pb-2 pr-3">120%</th>
              <th className="pb-2 pr-3">Aprobado</th><th className="pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="py-2 pr-3 font-mono text-cyan-400">{b.month_date?.substring(0, 7)}</td>
                <td className="py-2 pr-3 text-slate-400 text-xs">{b.scope_type}</td>
                <td className="py-2 pr-3">{b.scope_label ?? '—'}</td>
                <td className="py-2 pr-3 text-emerald-400">{money(b.target_amount)}</td>
                <td className="py-2 pr-3">{b.target_count}</td>
                <td className="py-2 pr-3 text-amber-400">{money(b.target_120_amount)}</td>
                <td className="py-2 pr-3 text-blue-400">{money(b.approved_target_amount)}</td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEdit(b)} className="text-xs btn-secondary">Editar</button>
                  <button onClick={() => del(b.id)} className="text-xs btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-slate-500">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
