'use client';

import { FormEvent, useEffect, useState } from 'react';
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

  useEffect(() => {
    loadUsers();
  }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !isAdmin) return;

    if (!coordinatorId) {
      setError('Selecciona un coordinador para el asesor');
      return;
    }

    try {
      await apiFetch('/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role: 'ASESOR',
          coordinatorId,
          category
        })
      });
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setCategory('GENERAL');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'No fue posible crear usuario');
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-card p-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-slate-300 text-sm mt-2">Este modulo esta disponible solo para administradores.</p>
      </div>
    );
  }

  const coordinators = rows.filter((item) => item.role === 'COORDINADOR');

  return (
    <div className="space-y-4">
      <header className="glass-card p-5">
        <h1 className="text-2xl font-semibold">Gestion de usuarios</h1>
        <p className="text-slate-300 text-sm mt-1">
          Alta de asesores vinculados a un coordinador y consulta global de usuarios.
        </p>
      </header>

      <form onSubmit={onCreate} className="glass-card p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          required
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium placeholder:text-slate-500"
        />
        <input
          required
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium placeholder:text-slate-500"
        />
        <input
          required
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium placeholder:text-slate-500"
        />
        <input
          required
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium placeholder:text-slate-500"
        />
        <select
          value={coordinatorId}
          onChange={(e) => setCoordinatorId(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          required
        >
          {coordinators.length === 0 ? <option value="">No hay coordinadores</option> : null}
          {coordinators.map((coord) => (
            <option key={coord.id} value={coord.id}>
              {coord.first_name} {coord.last_name} - {coord.coordinator_zone_name || 'Sin zona'}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
        >
          <option value="GENERAL">GENERAL</option>
          <option value="SENIOR">SENIOR</option>
        </select>
        <button className="md:col-span-6 rounded-lg bg-cyan text-ink font-semibold px-4 py-2">Crear asesor</button>
      </form>

      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm">Cargando...</p> : null}

      <div className="glass-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Activo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                <td className="px-4 py-3">{row.first_name + ' ' + row.last_name}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.role}</td>
                <td className="px-4 py-3">{row.coordinator_zone_name || row.advisor_zone_name || '-'}</td>
                <td className="px-4 py-3">{row.is_active ? 'Si' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
