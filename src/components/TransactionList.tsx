'use client';

import { useState } from 'react';

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

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange?: (transactionId: number, categoryId: number) => void;
  showCategoryDropdown?: boolean;
}

export default function TransactionList({
  transactions,
  categories,
  onCategoryChange,
  showCategoryDropdown = false,
}: TransactionListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCategoryChange = (transactionId: number, categoryId: number) => {
    if (onCategoryChange) {
      onCategoryChange(transactionId, categoryId);
    }
    setEditingId(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-[#666]">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead className="bg-[#1a1a1a] border-b border-[#262626]">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#a1a1aa]">Date</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#a1a1aa]">Merchant</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#a1a1aa]">Category</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-[#a1a1aa]">Amount</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-[#a1a1aa]">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
              <td className="px-4 py-3 text-sm text-[#a1a1aa]">
                {formatDate(tx.transaction_date)}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">{tx.merchant}</span>
              </td>
              <td className="px-4 py-3">
                {showCategoryDropdown && editingId === tx.id ? (
                  <select
                    className="select text-sm"
                    value={tx.category_id || ''}
                    onChange={(e) => handleCategoryChange(tx.id, parseInt(e.target.value))}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => showCategoryDropdown && setEditingId(tx.id)}
                    className={`inline-flex items-center gap-2 px-2 py-1 rounded text-sm ${
                      showCategoryDropdown ? 'hover:bg-[#262626] cursor-pointer' : ''
                    }`}
                    style={{
                      backgroundColor: tx.category_color
                        ? `${tx.category_color}20`
                        : '#26262640',
                      color: tx.category_color || '#a1a1aa',
                    }}
                  >
                    {tx.category_name || 'Uncategorized'}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatCurrency(tx.amount)}
              </td>
              <td className="px-4 py-3 text-center">
                {tx.confidence !== null && (
                  <span
                    className={`text-sm ${
                      tx.confidence >= 0.8
                        ? 'text-green-400'
                        : tx.confidence >= 0.5
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {(tx.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
