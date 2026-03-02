'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import { apiFetch } from '@/lib/api';  // No usado mientras SaaS esté deshabilitado
import { AppUser, getUser } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const storedUser = getUser();
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUser(storedUser);

    // ── Módulo SaaS deshabilitado (uso empresa interna, no multitenant) ──────
    // const token = localStorage.getItem('sf_access_token');
    // if (!token) return;
    // apiFetch<any>('/saas/branding', { token })
    //   .then((branding) => {
    //     if (branding?.primary_color) {
    //       document.documentElement.style.setProperty('--accent', branding.primary_color);
    //     }
    //     if (branding?.secondary_color) {
    //       document.documentElement.style.setProperty('--bg-soft', branding.secondary_color);
    //     }
    //   })
    //   .catch(() => {
    //     // Branding es opcional para roles sin acceso al módulo SaaS.
    //   });
  }, [router]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-slate-300">Cargando panel...</div>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar user={user} />
      <main className="min-h-screen pl-0 transition-all duration-300">
        <div className="max-w-[1500px] mx-auto p-4 md:p-6 space-y-4">
          {children}
        </div>
      </main>
    </div>
  );
}
