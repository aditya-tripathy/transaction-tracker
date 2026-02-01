'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyTrend {
  month: string;
  total: number;
  categories: Record<string, number>;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
}

const COLORS = [
  '#EF4444', // Food
  '#F59E0B', // Transport
  '#8B5CF6', // Shopping
  '#EC4899', // Entertainment
  '#3B82F6', // Bills
  '#10B981', // Healthcare
  '#06B6D4', // Travel
  '#6B7280', // Others
];

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  // Get all unique categories
  const allCategories = new Set<string>();
  data.forEach((d) => {
    Object.keys(d.categories).forEach((c) => allCategories.add(c));
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="card h-80 flex items-center justify-center">
        <p className="text-[#666]">No trend data available</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    ...d.categories,
  }));

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Monthly Spending Trends</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: '#262626' }}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: '#262626' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-[#ededed] text-sm">{value}</span>}
            />
            {Array.from(allCategories).map((category, index) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
