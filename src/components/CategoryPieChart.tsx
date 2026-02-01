'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CategoryData {
  category_name: string;
  color_code: string;
  total_amount: number;
  percentage: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const filteredData = data.filter((d) => d.total_amount > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-3">
          <p className="font-medium">{data.category_name}</p>
          <p className="text-sm text-[#a1a1aa]">{formatCurrency(data.total_amount)}</p>
          <p className="text-sm text-[#a1a1aa]">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (filteredData.length === 0) {
    return (
      <div className="card h-80 flex items-center justify-center">
        <p className="text-[#666]">No spending data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="total_amount"
              nameKey="category_name"
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color_code} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-[#ededed]">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
