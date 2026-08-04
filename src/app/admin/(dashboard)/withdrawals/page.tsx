"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function AdminWithdrawalsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/withdrawals")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setList(d);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Withdrawals</h1>
      <p className="text-sm text-stone-500 mb-6">
        Audit log only. Owners withdraw themselves via the developer portal. Platform fees were
        already taken on each donation.
      </p>
      {loading && <p className="text-sm text-stone-500">Loading…</p>}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {new Date(w.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{w.developer?.name}</div>
                  <div className="text-xs text-stone-500">{w.developer?.email}</div>
                </td>
                <td className="px-4 py-3">{w.project?.title}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(w.amount), w.currency)}
                </td>
                <td className="px-4 py-3">{w.phone}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium">{w.status}</span>
                  {w.payoutError && (
                    <p className="text-xs text-red-600 max-w-[160px]">{w.payoutError}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && list.length === 0 && (
          <p className="text-center text-stone-500 py-10 text-sm">No withdrawals yet.</p>
        )}
      </div>
    </div>
  );
}
