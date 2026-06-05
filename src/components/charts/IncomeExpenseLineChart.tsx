import {
  ResponsiveContainer,
  LineChart,
  Line,
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

export function IncomeExpenseLineChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
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
            cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.2 }}
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
          <Line
            type="monotone"
            dataKey="income"
            name="Receita"
            stroke="var(--success)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--success)' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Despesa"
            stroke="var(--danger)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--danger)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
