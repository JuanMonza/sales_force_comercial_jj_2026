'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = {
  fecha_diligenciamiento: string;
  nominal: string | number;
};

export function SalesTrendChart({ data }: { data: Point[] }) {
  const normalized = data.map((item) => ({
    fecha: item.fecha_diligenciamiento,
    nominal: Number(item.nominal)
  }));

  return (
    <div className="glass-card p-4 h-[320px]">
      <p className="text-sm text-slate-300 mb-3">Tendencia de ventas (mes actual y anterior)</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalized}>
          <XAxis dataKey="fecha" stroke="#9eb0d1" />
          <YAxis stroke="#9eb0d1" />
          <Tooltip
            contentStyle={{
              background: 'rgba(12,16,25,0.9)',
              border: '1px solid rgba(35,199,217,0.35)',
              borderRadius: 10
            }}
          />
          <Line
            type="monotone"
            dataKey="nominal"
            stroke="#23c7d9"
            strokeWidth={3}
            dot={{ r: 3, stroke: '#6ef2c8', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

