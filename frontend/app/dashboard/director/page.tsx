// 'use client';
// Panel Director — deshabilitado temporalmente.
// Descomentar cuando el rol DIRECTOR esté activo en la empresa.
//
// import { RoleKpiDashboard } from '@/components/RoleKpiDashboard';
//
// export default function DirectorDashboardPage() {
//   return <RoleKpiDashboard role="DIRECTOR" />;
// }

export default function DirectorDashboardPage() {
  return (
    <div className="glass-card p-8 text-center space-y-2">
      <p className="text-slate-400 text-sm">Panel Director deshabilitado.</p>
      <p className="text-xs text-slate-600">Módulo pendiente de activación para esta empresa.</p>
    </div>
  );
}

