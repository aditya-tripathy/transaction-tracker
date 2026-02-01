'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface Category {
  id: number;
  name: string;
  spending_limit: number | null;
  color_code: string;
  icon: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Category>>({});

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditValues({
      spending_limit: category.spending_limit,
      color_code: category.color_code,
    });
  };

  const handleSave = async (id: number) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          spendingLimit: editValues.spending_limit || null,
          colorCode: editValues.color_code,
        }),
      });

      if (response.ok) {
        fetchCategories();
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-[#a1a1aa]">Manage spending categories and limits</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#1a1a1a] border-b border-[#262626]">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[#a1a1aa]">Color</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[#a1a1aa]">Category</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-[#a1a1aa]">Spending Limit</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-[#a1a1aa]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                      <td className="px-4 py-3">
                        {editingId === category.id ? (
                          <input
                            type="color"
                            value={editValues.color_code || category.color_code}
                            onChange={(e) =>
                              setEditValues({ ...editValues, color_code: e.target.value })
                            }
                            className="w-10 h-8 rounded cursor-pointer"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: category.color_code }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{category.name}</td>
                      <td className="px-4 py-3 text-right">
                        {editingId === category.id ? (
                          <input
                            type="number"
                            value={editValues.spending_limit || ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                spending_limit: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="No limit"
                            className="input w-32 text-right"
                          />
                        ) : (
                          formatCurrency(category.spending_limit)
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === category.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSave(category.id)}
                              className="btn btn-primary text-sm py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn btn-secondary text-sm py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(category)}
                            className="btn btn-secondary text-sm py-1"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 card bg-blue-500/10 border-blue-500/30">
            <h3 className="font-semibold text-blue-400 mb-2">About Spending Limits</h3>
            <p className="text-sm text-[#a1a1aa]">
              Set monthly spending limits for each category. You&apos;ll receive alerts on the
              dashboard when spending exceeds these limits.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
