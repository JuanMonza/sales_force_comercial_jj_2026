'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TENANT_ID, apiFetch } from '@/lib/api';
import { AppUser, saveSession } from '@/lib/auth';

type LoginResponse = {
  accessToken: string;
  user: AppUser;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          tenantId: TENANT_ID
        })
      });

      saveSession(response.accessToken, response.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'No fue posible iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 fade-in">
        <p className="text-cyan text-sm tracking-[0.18em] uppercase mb-3">Sales Force Comercial</p>
        <h1 className="text-3xl font-semibold mb-2">Acceso empresarial</h1>
        <p className="text-slate-300 mb-6 text-sm">Ingresa con tu usuario para abrir el panel por rol.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Correo</label>
            <input
              className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2 text-black font-medium placeholder:text-slate-500 outline-none focus:border-cyan"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Contrasena</label>
            <input
              className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2 text-black font-medium placeholder:text-slate-500 outline-none focus:border-cyan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {error ? <p className="text-rose text-sm">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan to-mint text-ink font-semibold py-2.5 hover:brightness-110 transition disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
