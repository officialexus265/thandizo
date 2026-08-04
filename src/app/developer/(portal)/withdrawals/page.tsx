"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

type ProjectOpt = { id: string; title: string };

export default function DeveloperWithdrawalsPage() {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [projectId, setProjectId] = useState("");
  const [money, setMoney] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/developer/my-projects")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length) {
          setProjects(d.map((p: any) => ({ id: p.id, title: p.title })));
          setProjectId(d[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function load(pid: string) {
    if (!pid) return;
    setLoading(true);
    fetch(`/api/developer/withdrawals?projectId=${pid}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.money) setMoney(d.money);
        if (Array.isArray(d.withdrawals)) setList(d.withdrawals);
        if (d.developer?.payoutPhone) setPhone(d.developer.payoutPhone);
        else if (d.developer?.phone) setPhone(d.developer.phone);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (projectId) load(projectId);
  }, [projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!phone) {
      toast.error("Enter your mobile money number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/developer/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, amount: n, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      toast.success("Withdrawal sent to your mobile money");
      setAmount("");
      load(projectId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="text-sm text-stone-500 mt-1">
          Withdraw available funds after platform fee. All donations go to the campaign; donors accepted fraud risk. Only MWK mobile money is automated.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Project</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {projects.length === 0 && (
          <p className="text-xs text-stone-500 mt-1">
            No projects yet.{" "}
            <Link href="/developer" className="text-red-700 underline">
              Dashboard
            </Link>
          </p>
        )}
      </div>

      {money && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-stone-500">Collected (gross)</p>
            <p className="font-semibold">{formatCurrency(money.collected, money.currency)}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-stone-500">Platform fees</p>
            <p className="font-semibold">{formatCurrency(money.fees, money.currency)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs text-green-800">Available</p>
            <p className="font-semibold text-green-900">
              {formatCurrency(money.available, money.currency)}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-stone-500">Withdrawn</p>
            <p className="font-semibold">{formatCurrency(money.withdrawn, money.currency)}</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Request withdrawal</h2>
        <div>
          <label className="text-sm font-medium">Amount (MWK)</label>
          <input
            type="number"
            min={1}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={money ? `Max ${money.available}` : ""}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Mobile money number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09… or +265…"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !projectId}
          className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {submitting ? "Processing…" : "Withdraw to mobile money"}
        </button>
      </form>

      <div>
        <h2 className="font-semibold mb-2">History</h2>
        {loading && <p className="text-sm text-stone-500">Loading…</p>}
        <ul className="space-y-2">
          {list.map((w) => (
            <li key={w.id} className="bg-white border rounded-lg px-4 py-3 text-sm flex justify-between gap-2">
              <div>
                <p className="font-medium">
                  {formatCurrency(Number(w.amount), w.currency)} → {w.phone}
                </p>
                <p className="text-xs text-stone-500">
                  {w.status} · {new Date(w.createdAt).toLocaleString()}
                  {w.payoutRef ? ` · ref ${w.payoutRef}` : ""}
                </p>
                {w.payoutError && (
                  <p className="text-xs text-red-600">{w.payoutError}</p>
                )}
              </div>
            </li>
          ))}
          {!loading && list.length === 0 && (
            <li className="text-sm text-stone-500">No withdrawals yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
