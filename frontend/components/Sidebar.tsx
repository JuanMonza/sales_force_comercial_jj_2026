'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppUser, clearSession } from '@/lib/auth';

type SidebarProps = {
  user: AppUser;
};

const items = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/director', label: 'Panel Director' },
  { href: '/dashboard/coordinador', label: 'Panel Coordinador' },
  { href: '/dashboard/sales', label: 'Ventas' },
  { href: '/dashboard/operations', label: 'Operaciones' },
  { href: '/dashboard/ai', label: 'IA Comercial' },
  // { href: '/dashboard/saas', label: 'SaaS' },  // Módulo SaaS — deshabilitado (uso empresa interna)
  { href: '/dashboard/users', label: 'Usuarios' },
  { href: '/dashboard/admin', label: 'Catálogos' }
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="glass-card p-4 h-fit sticky top-4">
      <p className="text-xs text-slate-400 uppercase tracking-[0.15em]">Rol</p>
      <p className="font-semibold mb-6">{user.role}</p>

      <nav className="space-y-2 mb-6">
        {items
          .filter((item) => {
            if (item.href === '/dashboard/users') return user.role === 'ADMINISTRADOR';
            if (item.href === '/dashboard/director') return user.role === 'DIRECTOR' || user.role === 'ADMINISTRADOR';
            if (item.href === '/dashboard/coordinador') {
              return user.role === 'COORDINADOR' || user.role === 'ADMINISTRADOR';
            }
            // if (item.href === '/dashboard/saas') return user.role === 'ADMINISTRADOR';
            if (item.href === '/dashboard/admin') return user.role === 'ADMINISTRADOR';
            if (item.href === '/dashboard/operations') {
              return user.role === 'ADMINISTRADOR' || user.role === 'DIRECTOR' || user.role === 'COORDINADOR';
            }
            if (item.href === '/dashboard/ai') {
              return (
                user.role === 'ADMINISTRADOR' ||
                user.role === 'DIRECTOR' ||
                user.role === 'COORDINADOR' ||
                user.role === 'ASESOR'
              );
            }
            return true;
          })
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 transition ${
                pathname === item.href ? 'bg-cyan/30 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </Link>
          ))}
      </nav>

      <button
        onClick={() => {
          clearSession();
          router.push('/');
        }}
        className="w-full rounded-lg border border-rose/40 text-rose px-3 py-2 hover:bg-rose/10 transition"
      >
        Cerrar sesion
      </button>
    </aside>
  );
}
