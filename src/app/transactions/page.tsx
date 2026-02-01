'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TransactionList from '@/components/TransactionList';

interface Transaction {
  id: number;
  merchant: string;
  amount: number;
  transaction_date: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  confidence: number | null;
}

interface Category {
  id: number;
  name: string;
  color_code: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (categoryId) params.set('categoryId', categoryId);
      if (search) params.set('search', search);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryId, search, page]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleCategoryChange = async (transactionId: number, newCategoryId: number) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newCategoryId, recordCorrection: true }),
      });

      if (response.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setSearch('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-[#a1a1aa]">View and manage your transactions</p>
          </div>

          {/* Filters */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                  className="input w-40"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                  className="input w-40"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
                  className="select w-40"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-[#a1a1aa] mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search merchant..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="input"
                />
              </div>
              <button onClick={clearFilters} className="btn btn-secondary">
                Clear
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="mb-4 text-sm text-[#a1a1aa]">
            Showing {transactions.length} of {total} transactions
            {(startDate || endDate || categoryId || search) && ' (filtered)'}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              categories={categories}
              onCategoryChange={handleCategoryChange}
              showCategoryDropdown={true}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-[#a1a1aa]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
