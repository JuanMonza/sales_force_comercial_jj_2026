'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMINISTRADOR' | 'DIRECTOR' | 'COORDINADOR' | 'ASESOR';
  is_active: boolean;
  coordinator_zone_name?: string | null;
  advisor_zone_name?: string | null;
};

const PAGE_SIZE = 15;

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [page, setPage] = useState(1);

  const user = getUser();
  const isAdmin = user?.role === 'ADMINISTRADOR';

  const loadUsers = async () => {
    const token = getToken();
    if (!token || !isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<UserRow[]>('/users', { token });
      setRows(data);
      const coordinators = data.filter((item) => item.role === 'COORDINADOR');
      if (!coordinatorId && coordinators.length > 0) {
        setCoordinatorId(coordinators[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !isAdmin) return;
    if (!coordinatorId) { setError('Selecciona un coordinador'); return; }
    try {
      await apiFetch('/users', {
        method: 'POST', token,
        body: JSON.stringify({ email, password, firstName, lastName, role: 'ASESOR', coordinatorId, category })
      });
      setEmail(''); setPassword(''); setFirstName(''); setLastName(''); setCategory('GENERAL');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'No fue posible crear usuario');
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-card p-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-slate-300 text-sm mt-2">Módulo disponible solo para administradores.</p>
      </div>
    );
  }

  const coordinators = rows.filter((item) => item.role === 'COORDINADOR');

  // Zonas únicas para filtro
  const uniqueZones = Array.from(new Set(
    rows.map((r) => r.coordinator_zone_name || r.advisor_zone_name || '').filter(Boolean)
  )).sort();

  // Reset página cuando cambian los filtros
  useEffect(() => { setPage(1); }, [search, roleFilter, zoneFilter]);

  // Filtrado
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      const bySearch = search ? name.includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) : true;
      const byRole = roleFilter ? r.role === roleFilter : true;
      const zone = r.coordinator_zone_name || r.advisor_zone_name || '';
      const byZone = zoneFilter ? zone === zoneFilter : true;
      return bySearch && byRole && byZone;
    });
  }, [rows, search, roleFilter, zoneFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Agrupado por zona del coordinador
  const byZone = useMemo(() => {
    const map: Record<string, UserRow[]> = {};
    filtered.forEach((r) => {
      const zone = r.coordinator_zone_name || r.advisor_zone_name || 'Sin zona';
      if (!map[zone]) map[zone] = [];
      map[zone].push(r);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <header className="glass-card p-5">
        <h1 className="text-2xl font-semibold">Gestión de Usuarios</h1>
        <p className="text-slate-300 text-sm mt-1">Alta de asesores y consulta agrupada por zona/coordinador.</p>
      </header>

      {/* Formulario creación */}
      <form onSubmit={onCreate} className="glass-card p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <input required placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
        <input required placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
        <input required type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
        <input required type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
        <select value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black" required>
          {coordinators.length === 0 ? <option value="">No hay coordinadores</option> : null}
          {coordinators.map((c) => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.coordinator_zone_name || 'Sin zona'}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
          <option value="GENERAL">GENERAL</option>
          <option value="SENIOR">SENIOR</option>
        </select>
        <button className="md:col-span-6 rounded-lg bg-cyan text-ink font-semibold px-4 py-2 hover:brightness-110">
          ➕ Crear asesor
        </button>
      </form>

      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm animate-pulse">Cargando...</p> : null}

      {/* Filtros tabla */}
      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input type="text" placeholder="Buscar nombre o correo..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black placeholder:text-slate-500" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
          <option value="">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="DIRECTOR">Director</option>
          <option value="COORDINADOR">Coordinador</option>
          <option value="ASESOR">Asesor</option>
        </select>
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black">
          <option value="">Todas las zonas</option>
          {uniqueZones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{filtered.length} usuarios</span>
          {(search || roleFilter || zoneFilter) && (
            <button onClick={() => { setSearch(''); setRoleFilter(''); setZoneFilter(''); }}
              className="text-xs text-rose/70 hover:text-rose border border-rose/30 rounded px-2 py-1">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resumen por zona */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(byZone).slice(0, 8).map(([zone, users]) => (
          <div key={zone} className="glass-card p-3">
            <p className="text-xs text-slate-400 truncate">{zone}</p>
            <p className="text-xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">usuarios</p>
          </div>
        ))}
      </div>

      {/* Tabla paginada */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
              <tr className="text-left text-slate-300 border-b border-white/10">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Activo</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  className="border-t border-slate-800/60 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-medium">{row.first_name} {row.last_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      row.role === 'ADMINISTRADOR' ? 'bg-cyan/20 text-cyan border border-cyan/30' :
                      row.role === 'DIRECTOR' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      row.role === 'COORDINADOR' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                      'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>{row.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.coordinator_zone_name || row.advisor_zone_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${row.is_active ? 'bg-green-400' : 'bg-rose-400'}`} />
                    {row.is_active ? 'Sí' : 'No'}
                  </td>
                </motion.tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay usuarios para los filtros aplicados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-slate-400">
              Página {page} de {totalPages} · {filtered.length} usuarios
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(1)}
                className="px-2 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">«</button>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">‹ Ant</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${
                      pageNum === page
                        ? 'bg-cyan/20 border-cyan/40 text-cyan font-bold'
                        : 'border-slate-700 hover:bg-slate-800'
                    }`}>{pageNum}</button>
                );
              })}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">Sig ›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
                className="px-2 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-800">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
