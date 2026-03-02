'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type Point = {
  fecha_diligenciamiento: string;
  nominal: string | number;
};

interface Props {
  data: Point[];
  /** Formato YYYY-MM del mes a mostrar como "mes actual" */
  month?: string;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function SalesTrendChart({ data, month }: Props) {
  const currentMonth = month ?? new Date().toISOString().slice(0, 7);
  const previousMonth = prevMonth(currentMonth);

  const chartData = useMemo(() => {
    const currMap = new Map<number, number>();
    const prevMap = new Map<number, number>();

    data.forEach((item) => {
      const dateStr = item.fecha_diligenciamiento;
      if (!dateStr) return;
      const day = Number(dateStr.slice(8, 10));
      if (dateStr.startsWith(currentMonth)) {
        currMap.set(day, (currMap.get(day) ?? 0) + Number(item.nominal));
      } else if (dateStr.startsWith(previousMonth)) {
        prevMap.set(day, (prevMap.get(day) ?? 0) + Number(item.nominal));
      }
    });

    const days = Array.from(new Set([...currMap.keys(), ...prevMap.keys()])).sort((a, b) => a - b);
    return days.map((dia) => ({
      dia,
      mesActual: currMap.get(dia) ?? 0,
      mesAnterior: prevMap.get(dia) ?? 0
    }));
  }, [data, currentMonth, previousMonth]);

  return (
    <div className="glass-card p-4 h-[320px]">
      <p className="text-sm font-medium mb-1">Tendencia de ventas — mes actual vs anterior</p>
      <p className="text-xs text-slate-400 mb-3">
        <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 mr-1 align-middle" />Mes actual ({currentMonth})
        &nbsp;&nbsp;
        <span className="inline-block w-3 h-3 rounded-full bg-violet-400 mr-1 align-middle" />Mes anterior ({previousMonth})
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="gradCurr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#23c7d9" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#23c7d9" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a29bfe" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a29bfe" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="dia" stroke="#9eb0d1" label={{ value: 'Dia', position: 'insideBottomRight', offset: -5, fill: '#9eb0d1', fontSize: 11 }} />
          <YAxis stroke="#9eb0d1" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `$${Number(value).toLocaleString('es-CO')}`,
              name === 'mesActual' ? 'Mes actual' : 'Mes anterior'
            ]}
            contentStyle={{
              background: 'rgba(12,16,25,0.92)',
              border: '1px solid rgba(35,199,217,0.35)',
              borderRadius: 10,
              fontSize: 12
            }}
          />
          <Legend
            formatter={(value) => (value === 'mesActual' ? 'Mes actual' : 'Mes anterior')}
          />
          <Area
            type="monotone"
            dataKey="mesActual"
            stroke="#23c7d9"
            strokeWidth={2.5}
            fill="url(#gradCurr)"
            dot={{ r: 3, strokeWidth: 0, fill: '#23c7d9' }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="mesAnterior"
            stroke="#a29bfe"
            strokeWidth={2.5}
            fill="url(#gradPrev)"
            dot={{ r: 3, strokeWidth: 0, fill: '#a29bfe' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

