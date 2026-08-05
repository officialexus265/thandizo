"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function DeveloperLedgerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/developer/ledger")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (!data?.account) return <p className="text-sm text-red-600">Could not load ledger</p>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Account ledger</h1>
        <p className="text-sm text-stone-500 mt-1">
          Full history since account creation. Platform fees are taken from donations; withdrawals
          are logged with date, time, amount, and phone.
        </p>
      </div>

      <section className="bg-white border rounded-xl p-5 text-sm space-y-1">
        <p>
          <span className="text-stone-500">Account created:</span>{" "}
          {new Date(data.account.createdAt).toLocaleString()}
        </p>
        <p>
          <span className="text-stone-500">Email:</span> {data.account.email}{" "}
          {data.account.emailVerified ? "✓" : "(unverified)"}
        </p>
        <p>
          <span className="text-stone-500">Phone:</span> {data.account.phone || "—"}{" "}
          {data.account.phoneVerified ? "✓" : ""}
        </p>
        <p>
          <span className="text-stone-500">KYC:</span> {data.account.kycStatus}
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-stone-500">Lifetime raised</p>
          <p className="font-bold">{formatCurrency(data.lifetime.raised, "MWK")}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-stone-500">Lifetime fees</p>
          <p className="font-bold">{formatCurrency(data.lifetime.fees, "MWK")}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-stone-500">Lifetime withdrawn</p>
          <p className="font-bold">{formatCurrency(data.lifetime.withdrawn, "MWK")}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-stone-500">Projects</p>
          <p className="font-bold">{data.lifetime.projectCount}</p>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Projects (raised separately)</h2>
        <ul className="space-y-2">
          {data.projects.map((p: any) => (
            <li key={p.id} className="bg-white border rounded-xl p-4 text-sm">
              <p className="font-medium">
                {p.title}{" "}
                <span className="text-xs text-stone-500">({p.status})</span>
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Created {new Date(p.createdAt).toLocaleString()}
              </p>
              <p className="mt-2">
                Raised {formatCurrency(p.raised, p.currency)} · Fees{" "}
                {formatCurrency(p.fees, p.currency)} · Available{" "}
                {formatCurrency(p.available, p.currency)} · Withdrawn{" "}
                {formatCurrency(p.withdrawn, p.currency)}
              </p>
            </li>
          ))}
          {data.projects.length === 0 && (
            <li className="text-sm text-stone-500">No projects yet.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Withdrawals</h2>
        <ul className="space-y-2">
          {data.withdrawals.map((w: any) => (
            <li key={w.id} className="bg-white border rounded-xl p-4 text-sm">
              <p className="font-medium">
                {formatCurrency(w.amount, w.currency)} → {w.phone}
              </p>
              <p className="text-xs text-stone-500">
                {w.projectTitle} · {w.status} · {new Date(w.createdAt).toLocaleString()}
                {w.completedAt ? ` · done ${new Date(w.completedAt).toLocaleString()}` : ""}
              </p>
              {w.payoutRef && <p className="text-xs text-stone-400">Ref {w.payoutRef}</p>}
            </li>
          ))}
          {data.withdrawals.length === 0 && (
            <li className="text-sm text-stone-500">No withdrawals yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
