'use client';

interface StatsCardsProps {
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
  topCategory: string;
}

export default function StatsCards({
  totalSpent,
  transactionCount,
  avgTransaction,
  topCategory,
}: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      label: 'Total Spent',
      value: formatCurrency(totalSpent),
      icon: '💸',
      color: 'bg-red-500/10 text-red-400',
    },
    {
      label: 'Transactions',
      value: transactionCount.toString(),
      icon: '📝',
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Avg Transaction',
      value: formatCurrency(avgTransaction),
      icon: '📈',
      color: 'bg-green-500/10 text-green-400',
    },
    {
      label: 'Top Category',
      value: topCategory,
      icon: '🏆',
      color: 'bg-purple-500/10 text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-[#a1a1aa]">{stat.label}</p>
              <p className="text-xl font-semibold">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
