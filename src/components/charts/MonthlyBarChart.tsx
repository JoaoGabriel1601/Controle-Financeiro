import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { MonthlySummary } from '../../utils/stats';
import { formatCurrency } from '../../utils/format';

interface Props {
  data: MonthlySummary[];
}

export function MonthlyBarChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `R$ ${Math.round(v / 100000)}k`}
          />
          <Tooltip
            cursor={{ fill: 'var(--primary-soft)' }}
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--text)',
              boxShadow: 'var(--shadow-md)',
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
          <Bar dataKey="income" name="Receita" fill="var(--success)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="Despesa" fill="var(--danger)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
