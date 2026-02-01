'use client';

interface Alert {
  category_name: string;
  spending_limit: number;
  total_spent: number;
}

interface AlertBannerProps {
  alerts: Alert[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <h4 className="font-semibold text-red-400">Budget Alerts</h4>
          <ul className="mt-2 space-y-1">
            {alerts.map((alert, index) => (
              <li key={index} className="text-sm text-red-300">
                <strong>{alert.category_name}</strong>: Spent {formatCurrency(alert.total_spent)}{' '}
                (limit: {formatCurrency(alert.spending_limit)})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
