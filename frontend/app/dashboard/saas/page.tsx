'use client';

import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type PlanRow = {
  id: string;
  code: string;
  name: string;
  monthly_price: string | number;
  yearly_price: string | number;
  max_users: number;
  max_monthly_records: number;
  is_active: boolean;
};

type SubscriptionRow = {
  id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  amount: string | number;
  starts_at: string;
  ends_at: string | null;
  auto_renew: boolean;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: string | number;
  issued_at: string;
  due_at: string | null;
};

type Branding = {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  dashboard_title: string | null;
  custom_css: string | null;
};

function money(v: number | string) {
  return `$${Number(v).toLocaleString('es-CO')}`;
}

export default function SaasPage() {
  const user = getUser();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [planForm, setPlanForm] = useState({
    code: '',
    name: '',
    monthlyPrice: '299',
    yearlyPrice: '2990',
    maxUsers: '250',
    maxMonthlyRecords: '10000000'
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    planId: '',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY'
  });

  const [invoiceForm, setInvoiceForm] = useState({
    amount: '0',
    taxAmount: '0',
    dueAt: ''
  });

  const [brandingForm, setBrandingForm] = useState({
    companyName: '',
    logoUrl: '',
    primaryColor: '#23c7d9',
    secondaryColor: '#0d2538',
    dashboardTitle: '',
    customCss: ''
  });

  const loadData = async () => {
    const token = getToken();
    if (!token || !isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [planRows, subscriptionRows, invoiceRows, brandingRow] = await Promise.all([
        apiFetch<PlanRow[]>('/saas/plans', { token }),
        apiFetch<SubscriptionRow[]>('/saas/subscriptions', { token }),
        apiFetch<InvoiceRow[]>('/saas/invoices', { token }),
        apiFetch<Branding>('/saas/branding', { token })
      ]);

      setPlans(planRows);
      setSubscriptions(subscriptionRows);
      setInvoices(invoiceRows);
      setBranding(brandingRow);
      if (!subscriptionForm.planId && planRows.length > 0) {
        setSubscriptionForm((prev) => ({ ...prev, planId: planRows[0].id }));
      }
      setBrandingForm({
        companyName: brandingRow.company_name ?? '',
        logoUrl: brandingRow.logo_url ?? '',
        primaryColor: brandingRow.primary_color ?? '#23c7d9',
        secondaryColor: brandingRow.secondary_color ?? '#0d2538',
        dashboardTitle: brandingRow.dashboard_title ?? '',
        customCss: brandingRow.custom_css ?? ''
      });
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar modulo SaaS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const withFeedback = async (callback: () => Promise<void>, okText: string) => {
    setMessage('');
    setError('');
    try {
      await callback();
      setMessage(okText);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Operacion fallida');
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-card p-6">
        <h1 className="text-2xl font-semibold">SaaS</h1>
        <p className="text-sm text-slate-300 mt-2">Este modulo es exclusivo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card p-5"
      >
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">SaaS</p>
        <h1 className="text-3xl font-semibold mt-1">Suscripciones, facturacion y branding por tenant</h1>
        <p className="text-sm text-slate-300 mt-2">
          Administra planes SaaS, ciclo de suscripcion, facturas y personalizacion visual de la empresa.
        </p>
      </motion.header>

      {message ? <p className="text-mint text-sm">{message}</p> : null}
      {error ? <p className="text-rose text-sm">{error}</p> : null}
      {loading ? <p className="text-slate-300 text-sm">Cargando...</p> : null}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nuevo plan SaaS</h2>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-2"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const token = getToken();
              if (!token) return;
              withFeedback(
                () =>
                  apiFetch('/saas/plans', {
                    method: 'POST',
                    token,
                    body: JSON.stringify({
                      code: planForm.code,
                      name: planForm.name,
                      monthlyPrice: Number(planForm.monthlyPrice),
                      yearlyPrice: Number(planForm.yearlyPrice),
                      maxUsers: Number(planForm.maxUsers),
                      maxMonthlyRecords: Number(planForm.maxMonthlyRecords),
                      features: {
                        ai: true,
                        observability: true,
                        exports_pdf_excel: true
                      }
                    })
                  }).then(() => undefined),
                'Plan SaaS creado'
              );
            }}
          >
            <input
              required
              placeholder="Codigo"
              value={planForm.code}
              onChange={(e) => setPlanForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              required
              placeholder="Nombre"
              value={planForm.name}
              onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              required
              placeholder="Precio mensual"
              value={planForm.monthlyPrice}
              onChange={(e) => setPlanForm((p) => ({ ...p, monthlyPrice: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              required
              placeholder="Precio anual"
              value={planForm.yearlyPrice}
              onChange={(e) => setPlanForm((p) => ({ ...p, yearlyPrice: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              required
              placeholder="Max usuarios"
              value={planForm.maxUsers}
              onChange={(e) => setPlanForm((p) => ({ ...p, maxUsers: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              required
              placeholder="Max registros mensuales"
              value={planForm.maxMonthlyRecords}
              onChange={(e) => setPlanForm((p) => ({ ...p, maxMonthlyRecords: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <button className="md:col-span-2 rounded-lg bg-cyan text-ink font-semibold px-4 py-2">
              Crear plan
            </button>
          </form>
        </div>

        <div className="glass-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">Crear suscripcion</h2>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-2"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const token = getToken();
              if (!token) return;
              withFeedback(
                () =>
                  apiFetch('/saas/subscriptions', {
                    method: 'POST',
                    token,
                    body: JSON.stringify(subscriptionForm)
                  }).then(() => undefined),
                'Suscripcion creada'
              );
            }}
          >
            <select
              value={subscriptionForm.planId}
              onChange={(e) => setSubscriptionForm((p) => ({ ...p, planId: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
              required
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({money(plan.monthly_price)}/mes)
                </option>
              ))}
            </select>
            <select
              value={subscriptionForm.status}
              onChange={(e) => setSubscriptionForm((p) => ({ ...p, status: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            >
              <option value="TRIAL">TRIAL</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAST_DUE">PAST_DUE</option>
              <option value="CANCELED">CANCELED</option>
            </select>
            <select
              value={subscriptionForm.billingCycle}
              onChange={(e) => setSubscriptionForm((p) => ({ ...p, billingCycle: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            >
              <option value="MONTHLY">MONTHLY</option>
              <option value="YEARLY">YEARLY</option>
            </select>
            <button className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2">Crear</button>
          </form>

          <h3 className="font-semibold mt-2">Crear factura</h3>
          <form
            className="grid grid-cols-1 md:grid-cols-3 gap-2"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const token = getToken();
              if (!token) return;
              withFeedback(
                () =>
                  apiFetch('/saas/invoices', {
                    method: 'POST',
                    token,
                    body: JSON.stringify({
                      amount: Number(invoiceForm.amount),
                      taxAmount: Number(invoiceForm.taxAmount),
                      dueAt: invoiceForm.dueAt || undefined
                    })
                  }).then(() => undefined),
                'Factura creada'
              );
            }}
          >
            <input
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="Monto"
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              value={invoiceForm.taxAmount}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, taxAmount: e.target.value }))}
              placeholder="Impuesto"
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <input
              type="date"
              value={invoiceForm.dueAt}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, dueAt: e.target.value }))}
              className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
            />
            <button className="md:col-span-3 rounded-lg border border-cyan/40 text-cyan px-4 py-2">Facturar</button>
          </form>
        </div>
      </section>

      <section className="glass-card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Branding por tenant</h2>
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-2"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;
            withFeedback(
              () =>
                apiFetch('/saas/branding', {
                  method: 'PATCH',
                  token,
                  body: JSON.stringify(brandingForm)
                }).then(() => undefined),
              'Branding actualizado'
            );
          }}
        >
          <input
            placeholder="Company name"
            value={brandingForm.companyName}
            onChange={(e) => setBrandingForm((p) => ({ ...p, companyName: e.target.value }))}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
          <input
            placeholder="Dashboard title"
            value={brandingForm.dashboardTitle}
            onChange={(e) => setBrandingForm((p) => ({ ...p, dashboardTitle: e.target.value }))}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
          <input
            placeholder="Logo URL"
            value={brandingForm.logoUrl}
            onChange={(e) => setBrandingForm((p) => ({ ...p, logoUrl: e.target.value }))}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
          <input
            placeholder="Primary color"
            value={brandingForm.primaryColor}
            onChange={(e) => setBrandingForm((p) => ({ ...p, primaryColor: e.target.value }))}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
          <input
            placeholder="Secondary color"
            value={brandingForm.secondaryColor}
            onChange={(e) => setBrandingForm((p) => ({ ...p, secondaryColor: e.target.value }))}
            className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-black font-medium"
          />
          <button className="rounded-lg bg-cyan text-ink font-semibold px-4 py-2">Guardar branding</button>
        </form>
        <div className="text-xs text-slate-400">
          Branding actual: {branding?.company_name || 'Sin definir'} | Primary {branding?.primary_color || '-'} |
          Secondary {branding?.secondary_color || '-'}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Planes</h3>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-slate-700 p-3 text-sm">
                <p className="font-medium">{plan.name}</p>
                <p className="text-xs text-slate-400">{plan.code}</p>
                <p className="text-xs mt-1">
                  {money(plan.monthly_price)} / mes | {money(plan.yearly_price)} / anio
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Suscripciones</h3>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-slate-700 p-3 text-sm">
                <p className="font-medium">{sub.plan_name}</p>
                <p className="text-xs text-slate-400">
                  {sub.status} | {sub.billing_cycle}
                </p>
                <p className="text-xs mt-1">Monto: {money(sub.amount)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-2">Facturas</h3>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-lg border border-slate-700 p-3 text-sm">
                <p className="font-medium">{inv.invoice_number}</p>
                <p className="text-xs text-slate-400">{inv.status}</p>
                <p className="text-xs mt-1">{money(inv.total_amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
