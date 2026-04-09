'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Customer, Deal } from '@/lib/stores/types';
import { loadCustomers, saveCustomers, addCustomer, upsertCustomer } from '@/lib/stores/customerStore';
import { loadDeals } from '@/lib/stores/dealsStore';
import { CustomerCard } from './CustomerCard';
import { CustomerForm } from './CustomerForm';
import { CustomerDetailModal } from './CustomerDetailModal';

const PAID_STAGES = new Set(['paid', 'invoiced', 'accounting']);

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setCustomers(loadCustomers());
    setDeals(loadDeals());
  }, []);

  const customerStats = useMemo(() => {
    const map = new Map<string, { dealCount: number; ltv: number; deals: Deal[] }>();
    for (const c of customers) {
      const related = deals.filter((d) => d.clientName === c.companyName);
      const ltv = related.filter((d) => PAID_STAGES.has(d.stage)).reduce((s, d) => s + d.amount, 0);
      map.set(c.id, { dealCount: related.length, ltv, deals: related });
    }
    return map;
  }, [customers, deals]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter((c) =>
      c.companyName.toLowerCase().includes(q) ||
      (c.contactName?.toLowerCase().includes(q)) ||
      (c.industry?.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const handleSave = (customer: Customer) => {
    if (editingId) {
      upsertCustomer(customer);
    } else {
      addCustomer(customer);
    }
    setCustomers(loadCustomers());
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDetailId(null);
    setShowForm(true);
  };

  const handleRemove = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    saveCustomers(updated);
    setCustomers(updated);
    setDetailId(null);
  };

  const detailCustomer = detailId ? customers.find((c) => c.id === detailId) : null;
  const editCustomer = editingId ? customers.find((c) => c.id === editingId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">顧客一覧</h2>
          <p className="text-xs text-gray-500 mt-0.5">{customers.length}社</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-colors"
        >
          ＋ 顧客追加
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="企業名・担当者・業種で検索..."
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
      />

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{editingId ? '顧客編集' : '新規顧客'}</h3>
          <CustomerForm
            initial={editCustomer}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            {customers.length === 0 ? '顧客が登録されていません' : '条件に一致する顧客がありません'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c) => {
            const stats = customerStats.get(c.id) ?? { dealCount: 0, ltv: 0, deals: [] };
            return (
              <CustomerCard
                key={c.id}
                customer={c}
                dealCount={stats.dealCount}
                ltv={stats.ltv}
                onClick={() => setDetailId(c.id)}
              />
            );
          })}
        </div>
      )}

      {detailCustomer && (
        <CustomerDetailModal
          customer={detailCustomer}
          deals={customerStats.get(detailCustomer.id)?.deals ?? []}
          onClose={() => setDetailId(null)}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
