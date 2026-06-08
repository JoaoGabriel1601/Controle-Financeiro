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
import { formatCompactCurrency, formatCurrency } from '../../utils/format';

interface Props {
  data: MonthlySummary[];
}

export function IncomeExpenseLineChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            padding={{ left: 16, right: 16 }}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, (max: number) => Math.max(max, 150000)]}
            tickCount={7}
            width={56}
            tickMargin={8}
            tickFormatter={(v) => formatCompactCurrency(Number(v))}
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
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 14 }} />
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
