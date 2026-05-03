import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { CategoryBreakdown } from '../../utils/stats';
import { formatCurrency } from '../../utils/format';

interface Props {
  data: CategoryBreakdown[];
}

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) return null;
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--bg-card)"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--text)',
              boxShadow: 'var(--shadow-md)',
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
