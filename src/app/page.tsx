'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import CategoryPieChart from '@/components/CategoryPieChart';
import MonthlyTrendChart from '@/components/MonthlyTrendChart';
import TransactionList from '@/components/TransactionList';
import AlertBanner from '@/components/AlertBanner';

interface DashboardData {
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
  topCategory: string;
  categoryBreakdown: Array<{
    category_id: number;
    category_name: string;
    color_code: string;
    total_amount: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    total: number;
    categories: Record<string, number>;
  }>;
  recentTransactions: Array<{
    id: number;
    merchant: string;
    amount: number;
    transaction_date: string;
    category_name: string;
    category_color: string;
  }>;
  alerts: Array<{
    category_name: string;
    spending_limit: number;
    total_spent: number;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/stats?months=6');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(`Synced ${result.transactionsCreated} new transactions`);
        fetchData();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-[#a1a1aa]">Overview of your spending</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn btn-primary flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <span className="spinner" />
                  Syncing...
                </>
              ) : (
                <>
                  🔄 Sync Emails
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : error ? (
            <div className="card bg-red-500/10 border-red-500/30 text-red-400">
              {error}
            </div>
          ) : data ? (
            <>
              <AlertBanner alerts={data.alerts} />

              <StatsCards
                totalSpent={data.totalSpent}
                transactionCount={data.transactionCount}
                avgTransaction={data.avgTransaction}
                topCategory={data.topCategory}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <CategoryPieChart data={data.categoryBreakdown} />
                <MonthlyTrendChart data={data.monthlyTrends} />
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
                <TransactionList
                  transactions={data.recentTransactions.map((t) => ({
                    ...t,
                    category_id: null,
                    confidence: null,
                  }))}
                  categories={[]}
                  showCategoryDropdown={false}
                />
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
