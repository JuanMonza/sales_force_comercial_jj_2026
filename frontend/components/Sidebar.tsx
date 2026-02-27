'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppUser, clearSession } from '@/lib/auth';

type SidebarProps = {
  user: AppUser;
};

const items = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/sales', label: 'Ventas' },
  { href: '/dashboard/users', label: 'Usuarios' }
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
          .filter((item) => (item.href === '/dashboard/users' ? user.role === 'ADMINISTRADOR' : true))
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

