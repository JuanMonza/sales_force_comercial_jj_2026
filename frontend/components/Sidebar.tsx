'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppUser, clearSession } from '@/lib/auth';

type SidebarProps = {
  user: AppUser;
};

const items = [
  { href: '/dashboard', label: 'Resumen', icon: '📊' },
  { href: '/dashboard/director', label: 'Panel Director', icon: '🧭' },
  { href: '/dashboard/coordinador', label: 'Panel Coordinador', icon: '🧩' },
  { href: '/dashboard/sales', label: 'Ventas', icon: '💰' },
  { href: '/dashboard/operations', label: 'Operaciones', icon: '⚙️' },
  { href: '/dashboard/ai', label: 'IA Comercial', icon: '🤖' },
  { href: '/dashboard/users', label: 'Usuarios', icon: '👥' },
  { href: '/dashboard/admin', label: 'Catálogos', icon: '📋' },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visibleItems = items.filter((item) => {
    if (item.href === '/dashboard/users') return user.role === 'ADMINISTRADOR';
    if (item.href === '/dashboard/director') return user.role === 'DIRECTOR' || user.role === 'ADMINISTRADOR';
    if (item.href === '/dashboard/coordinador') {
      return user.role === 'COORDINADOR' || user.role === 'ADMINISTRADOR';
    }
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
  });

  return (
    <>
      {/* Botón hamburguesa fijo */}
      <button
        aria-label="Menú"
        onClick={() => setOpen((v) => !v)}
        className="fixed top-4 left-4 z-50 w-11 h-11 flex flex-col items-center justify-center gap-[5px] rounded-xl
          bg-slate-900/80 backdrop-blur border border-white/10 shadow-[0_0_20px_rgba(35,199,217,0.35)]
          hover:shadow-[0_0_32px_rgba(35,199,217,0.65)] hover:border-cyan/50 transition-all duration-300"
      >
        <motion.span
          animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          className="block w-5 h-[2px] rounded-full bg-cyan pointer-events-none"
        />
        <motion.span
          animate={open ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="block w-5 h-[2px] rounded-full bg-cyan pointer-events-none"
        />
        <motion.span
          animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          className="block w-5 h-[2px] rounded-full bg-cyan pointer-events-none"
        />
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Panel lateral */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="sidebar"
            initial={{ x: -290, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -290, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.85 }}
            className="fixed top-0 left-0 z-50 h-screen w-72 flex flex-col
              bg-slate-900/85 backdrop-blur-2xl border-r border-white/10
              shadow-[10px_0_60px_rgba(35,199,217,0.18)]"
          >
            {/* Linea glow superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px]
              bg-gradient-to-r from-transparent via-cyan to-transparent pointer-events-none" />

            {/* Header usuario */}
            <div className="px-5 pt-16 pb-4 border-b border-white/10">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, type: 'spring', stiffness: 260, damping: 20 }}
              >
                <p className="text-[10px] text-cyan/70 uppercase tracking-[0.2em] font-semibold">Fuerza Comercial</p>
                <p className="text-base font-bold text-white mt-1 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <span className="inline-block mt-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full
                  bg-cyan/15 text-cyan border border-cyan/30 tracking-wide">
                  {user.role}
                </span>
              </motion.div>
            </div>

            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {visibleItems.map((item, idx) => {
                const active = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-200
                        ${active
                          ? 'bg-gradient-to-r from-cyan/20 to-cyan/5 text-white border border-cyan/30 shadow-[0_0_16px_rgba(35,199,217,0.22)]'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10'
                        }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                      {active && (
                        <motion.span
                          layoutId="pill"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_6px_rgba(35,199,217,0.9)]"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-white/10">
              <button
                onClick={() => { clearSession(); router.push('/'); }}
                className="w-full rounded-xl border border-rose/40 text-rose px-3 py-2.5
                  hover:bg-rose/10 hover:shadow-[0_0_16px_rgba(255,107,129,0.3)]
                  transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
              >
                <span>🚪</span> Cerrar sesión
              </button>
              <p className="text-center text-[10px] text-slate-600 mt-3">v2.0 · 2026</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
