'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  document_id: string | null;
  role: 'ADMINISTRADOR' | 'DIRECTOR' | 'COORDINADOR' | 'ASESOR';
  is_active: boolean;
  regional_id?: string | null;
  coordinator_zone_id?: string | null;
  coordinator_zone_name?: string | null;
  advisor_zone_id?: string | null;
  advisor_zone_name?: string | null;
  category?: string | null;
};

type CatalogItem = { id: string; name: string };

type Catalogs = {
  regionals: CatalogItem[];
  zones: CatalogItem[];
  coordinators: CatalogItem[];
};

type CreateForm = {
  role: 'ASESOR' | 'COORDINADOR' | 'DIRECTOR';
  firstName: string; lastName: string;
  email: string; password: string; documentId: string;
  regionalId: string; zoneId: string; coordinatorId: string;
  category: string;
};

type EditForm = {
  firstName: string; lastName: string;
  documentId: string; password: string; isActive: boolean;
};

const PAGE_SIZE = 15;
const ROLE_COLORS: Record<string, string> = {
  ADMINISTRADOR: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  DIRECTOR:      'bg-purple-500/20 text-purple-300 border-purple-500/30',
  COORDINADOR:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ASESOR:        'bg-green-500/20 text-green-300 border-green-500/30',
};

const BLANK_CREATE: CreateForm = {
  role: 'ASESOR', firstName: '', lastName: '', email: '', password: '',
  documentId: '', regionalId: '', zoneId: '', coordinatorId: '', category: 'GENERAL'
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs>({ regionals: [], zones: [], coordinators: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Create form state
  const [form, setForm] = useState<CreateForm>(BLANK_CREATE);
  const setF = (patch: Partial<CreateForm>) => setForm((p) => ({ ...p, ...patch }));

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', documentId: '', password: '', isActive: true });
  const setEF = (patch: Partial<EditForm>) => setEditForm((p) => ({ ...p, ...patch }));

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const user = getUser();
  const isAdmin = user?.role === 'ADMINISTRADOR';

  const loadAll = async () => {
    const token = getToken();
    if (!token || !isAdmin) return;
    setLoading(true); setError('');
    try {
      const [usersData, catalogsData] = await Promise.all([
        apiFetch<UserRow[]>('/users', { token }),
        apiFetch<{ regionals: CatalogItem[]; zones: CatalogItem[]; coordinators: CatalogItem[] }>('/sales/catalogs', { token })
      ]);
      setRows(usersData);
      setCatalogs({
        regionals: catalogsData.regionals ?? [],
        zones: catalogsData.zones ?? [],
        coordinators: usersData.filter((u) => u.role === 'COORDINADOR').map((u) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name} — ${u.coordinator_zone_name || 'Sin zona'}`
        }))
      });
    } catch (err: any) { setError(err.message || 'No fue posible cargar'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    try {
      const body: Record<string, unknown> = {
        email: form.email, password: form.password,
        firstName: form.firstName, lastName: form.lastName,
        documentId: form.documentId || undefined,
        role: form.role,
      };
      if (form.role === 'DIRECTOR') body.regionalId = form.regionalId;
      if (form.role === 'COORDINADOR') body.zoneId = form.zoneId;
      if (form.role === 'ASESOR') { body.coordinatorId = form.coordinatorId; body.category = form.category; }
      await apiFetch('/users', { method: 'POST', token, body: JSON.stringify(body) });
      setForm(BLANK_CREATE);
      loadAll();
    } catch (err: any) { setError(err.message || 'No fue posible crear'); }
  };

  const openEdit = (row: UserRow) => {
    setEditId(row.id);
    setEditForm({ firstName: row.first_name, lastName: row.last_name, documentId: row.document_id ?? '', password: '', isActive: row.is_active });
  };

  const onSaveEdit = async () => {
    const token = getToken();
    if (!token || !editId) return;
    try {
      const body: Record<string, unknown> = {
        firstName: editForm.firstName, lastName: editForm.lastName,
        documentId: editForm.documentId || undefined,
        isActive: editForm.isActive,
      };
      if (editForm.password) body.password = editForm.password;
      await apiFetch(`/users/${editId}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      setEditId(null);
      loadAll();
    } catch (err: any) { setError(err.message || 'No fue posible guardar'); }
  };

  const onToggleActive = async (row: UserRow) => {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(`/users/${row.id}`, { method: 'PATCH', token, body: JSON.stringify({ isActive: !row.is_active }) });
      loadAll();
    } catch (err: any) { setError(err.message || 'Error'); }
  };

  const onDelete = async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE', token });
      setDeleteId(null);
      loadAll();
    } catch (err: any) { setError(err.message || 'No fue posible eliminar'); }
  };

  if (!isAdmin) {
    return (
      <div className="glass-card p-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-slate-300 text-sm mt-2">Modulo disponible solo para administradores.</p>
      </div>
    );
  }

  // Filtrado y paginacion
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filtered = useMemo(() => rows.filter((r) => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase();
    const bySearch = search ? name.includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || (r.document_id ?? '').includes(search) : true;
    const byRole = roleFilter ? r.role === roleFilter : true;
    return bySearch && byRole;
  }), [rows, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totales = { total: rows.length, activos: rows.filter(r => r.is_active).length, inactivos: rows.filter(r => !r.is_active).length };

  return (
    <div className="space-y-4">
      <header className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gestion de Usuarios</h1>
          <p className="text-slate-300 text-sm mt-1">Crear y administrar directores, coordinadores y asesores.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="glass-card px-3 py-1.5 rounded-lg">{totales.total} total</span>
          <span className="glass-card px-3 py-1.5 rounded-lg text-green-400">{totales.activos} activos</span>
          <span className="glass-card px-3 py-1.5 rounded-lg text-rose-400">{totales.inactivos} inactivos</span>
        </div>
      </header>

      {/* ——— FORMULARIO CREACION ——— */}
      <form onSubmit={onCreate} className="glass-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Crear nuevo usuario</h2>

        {/* Selector de rol */}
        <div className="flex gap-2 flex-wrap">
          {(['ASESOR', 'COORDINADOR', 'DIRECTOR'] as const).map((r) => (
            <button type="button" key={r}
              onClick={() => setF({ role: r })}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                form.role === r ? ROLE_COLORS[r] + ' border' : 'border-slate-600 text-slate-400 hover:border-slate-400'
              }`}>
              {r}
            </button>
          ))}
        </div>

        {/* Campos base */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input required placeholder="Nombre" value={form.firstName} onChange={(e) => setF({ firstName: e.target.value })}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
          <input required placeholder="Apellido" value={form.lastName} onChange={(e) => setF({ lastName: e.target.value })}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
          <input placeholder="Cedula / Documento" value={form.documentId} onChange={(e) => setF({ documentId: e.target.value })}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
          <input required type="email" placeholder="Correo electronico" value={form.email} onChange={(e) => setF({ email: e.target.value })}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
          <input required type="password" placeholder="Contrasena (min 6 car.)" value={form.password} onChange={(e) => setF({ password: e.target.value })}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />

          {/* Campo especifico por rol */}
          {form.role === 'DIRECTOR' && (
            <select required value={form.regionalId} onChange={(e) => setF({ regionalId: e.target.value })}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
              <option value="">Seleccionar Regional</option>
              {catalogs.regionals.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {form.role === 'COORDINADOR' && (
            <select required value={form.zoneId} onChange={(e) => setF({ zoneId: e.target.value })}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
              <option value="">Seleccionar Zona</option>
              {catalogs.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          )}
          {form.role === 'ASESOR' && (<>
            <select required value={form.coordinatorId} onChange={(e) => setF({ coordinatorId: e.target.value })}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
              <option value="">Seleccionar Coordinador</option>
              {catalogs.coordinators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.category} onChange={(e) => setF({ category: e.target.value })}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
              <option value="GENERAL">GENERAL</option>
              <option value="SENIOR">SENIOR</option>
            </select>
          </>)}
        </div>

        <button className="rounded-lg bg-cyan-400 text-slate-900 font-semibold px-5 py-2 hover:brightness-110 transition-all">
          Crear {form.role.charAt(0) + form.role.slice(1).toLowerCase()}
        </button>
      </form>

      {error ? <p className="text-rose-400 text-sm glass-card px-4 py-2">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm animate-pulse">Cargando...</p> : null}

      {/* ——— FILTROS ——— */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Buscar nombre, correo o cedula..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500 flex-1 min-w-[200px]" />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
          <option value="">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="DIRECTOR">Director</option>
          <option value="COORDINADOR">Coordinador</option>
          <option value="ASESOR">Asesor</option>
        </select>
        {(search || roleFilter) && (
          <button onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}
            className="text-xs text-rose-400 border border-rose-400/30 rounded px-3 py-2 hover:bg-rose-400/10">
            Limpiar
          </button>
        )}
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} usuarios</span>
      </div>

      {/* ——— TABLA ——— */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
              <tr className="text-left text-slate-300 border-b border-white/10">
                <th className="px-4 py-3">Nombre completo</th>
                <th className="px-4 py-3">Cedula</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Zona / Regional</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <>
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`border-t border-slate-800/60 hover:bg-slate-800/30 ${editId === row.id ? 'bg-slate-800/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{row.first_name} {row.last_name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.document_id || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{row.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${ROLE_COLORS[row.role] ?? ''}`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {row.coordinator_zone_name || row.advisor_zone_name || row.regional_id || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => onToggleActive(row)}
                        title="Click para cambiar estado"
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border transition-all hover:brightness-125 ${
                          row.is_active ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-green-400' : 'bg-rose-400'}`} />
                        {row.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => editId === row.id ? setEditId(null) : openEdit(row)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/15 transition-colors">
                          {editId === row.id ? 'Cerrar' : 'Editar'}
                        </button>
                        <button onClick={() => setDeleteId(row.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 transition-colors">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </motion.tr>

                  {/* Panel edicion inline */}
                  <AnimatePresence>
                    {editId === row.id && (
                      <tr key={`edit-${row.id}`}>
                        <td colSpan={7} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-slate-800/60 border-y border-cyan-500/20 px-5 py-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
                              <div className="xl:col-span-5 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                                Editando: {row.first_name} {row.last_name}
                              </div>
                              <input placeholder="Nombre" value={editForm.firstName} onChange={(e) => setEF({ firstName: e.target.value })}
                                className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
                              <input placeholder="Apellido" value={editForm.lastName} onChange={(e) => setEF({ lastName: e.target.value })}
                                className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
                              <input placeholder="Cedula / Documento" value={editForm.documentId} onChange={(e) => setEF({ documentId: e.target.value })}
                                className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
                              <input type="password" placeholder="Nueva contrasena (opcional)" value={editForm.password} onChange={(e) => setEF({ password: e.target.value })}
                                className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
                              <select value={editForm.isActive ? 'true' : 'false'} onChange={(e) => setEF({ isActive: e.target.value === 'true' })}
                                className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                              </select>
                              <div className="flex gap-3 xl:col-span-5">
                                <button type="button" onClick={onSaveEdit}
                                  className="rounded-lg bg-cyan-400 text-slate-900 font-semibold px-4 py-2 text-sm hover:brightness-110">
                                  Guardar cambios
                                </button>
                                <button type="button" onClick={() => setEditId(null)}
                                  className="rounded-lg border border-slate-600 text-slate-400 px-4 py-2 text-sm hover:bg-slate-700/50">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay usuarios para los filtros aplicados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-slate-400">Pagina {page} de {totalPages} · {filtered.length} usuarios</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">«</button>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${pageNum === page ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold' : 'border-slate-700 hover:bg-slate-800'}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ——— MODAL CONFIRMACION ELIMINAR ——— */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-sm w-full mx-4 space-y-4"
            >
              <h3 className="text-lg font-semibold">Confirmar eliminacion</h3>
              <p className="text-slate-300 text-sm">
                Esta accion desactivara al usuario permanentemente. El registro se conserva en auditoria.
              </p>
              <div className="flex gap-3">
                <button onClick={() => onDelete(deleteId)}
                  className="flex-1 rounded-lg bg-rose-500 text-white font-semibold px-4 py-2 hover:bg-rose-600 transition-colors">
                  Confirmar eliminacion
                </button>
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 rounded-lg border border-slate-600 text-slate-300 px-4 py-2 hover:bg-slate-700/50">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
