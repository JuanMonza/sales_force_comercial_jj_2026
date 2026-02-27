'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

export default function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('ASESOR');
  const [loading, setLoading] = useState(false);

  const user = getUser();
  const isAdmin = user?.role === 'ADMINISTRADOR';

  const loadUsers = async () => {
    const token = getToken();
    if (!token || !isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<any[]>('/users', { token });
      setRows(data);
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

    try {
      await apiFetch('/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role
        })
      });
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRole('ASESOR');
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

  return (
    <div className="space-y-4">
      <header className="glass-card p-5">
        <h1 className="text-2xl font-semibold">Gestion de usuarios</h1>
        <p className="text-slate-300 text-sm mt-1">Alta y consulta de usuarios por rol.</p>
      </header>

      <form onSubmit={onCreate} className="glass-card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          required
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
        />
        <input
          required
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
        />
        <input
          required
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
        />
        <input
          required
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg bg-slate-900/65 border border-cyan/20 px-3 py-2"
        >
          <option value="ADMINISTRADOR">ADMINISTRADOR</option>
          <option value="DIRECTOR">DIRECTOR</option>
          <option value="COORDINADOR">COORDINADOR</option>
          <option value="ASESOR">ASESOR</option>
        </select>
        <button className="md:col-span-5 rounded-lg bg-cyan text-ink font-semibold px-4 py-2">Crear usuario</button>
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
              <th className="px-4 py-3">Activo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                <td className="px-4 py-3">{row.first_name + ' ' + row.last_name}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.role}</td>
                <td className="px-4 py-3">{row.is_active ? 'Si' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

