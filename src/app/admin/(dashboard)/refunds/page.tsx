"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ProjectOption {
  id: string;
  title: string;
  status: string;
}

interface DonorRow {
  key: string;
  donorName: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  canAutoPayout: boolean;
  skipReason?: string;
  donationIds: string[];
}

export default function RefundsPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [reason, setReason] = useState("Project flagged as not legitimate");
  const [preview, setPreview] = useState<{
    project: { title: string; status: string };
    donors: DonorRow[];
    feePercent?: number;
    totals: {
      donorCount: number;
      totalGross: number;
      totalFees: number;
      totalNet: number;
      autoPayoutCount: number;
      manualCount: number;
    };
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(
            data
              .filter((p: any) => p.status === "ACTIVE" || p.status === "FLAGGED")
              .map((p: any) => ({ id: p.id, title: p.title, status: p.status }))
          );
        }
      })
      .catch(() => {});

    fetch("/api/admin/refunds")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBatches(data);
      })
      .catch(() => {});
  }, []);

  async function loadPreview() {
    if (!projectId) return;
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/admin/refunds?projectId=${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load preview");
      setPreview(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function execute() {
    if (!projectId || !reason.trim()) {
      toast.error("Select a project and enter a reason");
      return;
    }
    if (!preview || preview.donors.length === 0) {
      toast.error("No held donations to refund");
      return;
    }

    const ok = confirm(
      `This will:\n• Flag the project as not legitimate\n• Attempt mobile money refunds (90% after 10% fee)\n• Notify donors\n\nContinue?`
    );
    if (!ok) return;

    setExecuting(true);
    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");

      toast.success(
        `Refund run finished. Success: ${data.successCount}, Failed: ${data.failCount}, Manual: ${data.manualCount}`
      );
      setPreview(null);
      setProjectId("");
      // refresh batches
      const b = await fetch("/api/admin/refunds").then((r) => r.json());
      if (Array.isArray(b)) setBatches(b);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Refunds</h1>
      <p className="text-stone-500 text-sm mb-6">
        Refund <strong>held</strong> donations for a project that is not legitimate.
        Only available before the project is finished or closed. adjustable processing fee (set in Settings) applies.
        Automatic payouts are MWK + phone only (Airtel / TNM).
      </p>

      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPreview(null);
            }}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          >
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reason shown to donors</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          />
        </div>

        <button
          type="button"
          onClick={loadPreview}
          disabled={!projectId || loadingPreview}
          className="px-4 py-2 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50 disabled:opacity-60"
        >
          {loadingPreview ? "Loading…" : "Preview refunds"}
        </button>
      </div>

      {preview && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
          <h2 className="font-semibold text-lg mb-1">{preview.project.title}</h2>
          <p className="text-sm text-stone-500 mb-4">
            Fee rate: {preview.feePercent ?? 10}% · {preview.totals.donorCount} donor(s) · Gross{" "}
            {formatCurrency(preview.totals.totalGross, "MWK")} · Fees{" "}
            {formatCurrency(preview.totals.totalFees, "MWK")} · Net to refund{" "}
            {formatCurrency(preview.totals.totalNet, "MWK")}
            <br />
            Auto payout: {preview.totals.autoPayoutCount} · Manual follow-up:{" "}
            {preview.totals.manualCount}
          </p>

          {preview.donors.length === 0 ? (
            <p className="text-stone-500 text-sm">No held SUCCESS donations to refund.</p>
          ) : (
            <>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Donor</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2 text-right">Gross</th>
                      <th className="px-3 py-2 text-right">Fee</th>
                      <th className="px-3 py-2 text-right">Net</th>
                      <th className="px-3 py-2">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {preview.donors.map((d) => (
                      <tr key={d.key}>
                        <td className="px-3 py-2">
                          {d.donorName || "Anonymous"}
                          {d.email && (
                            <div className="text-xs text-stone-400">{d.email}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">{d.phone || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(d.grossAmount, d.currency)}
                        </td>
                        <td className="px-3 py-2 text-right text-stone-500">
                          {formatCurrency(d.feeAmount, d.currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">
                          {formatCurrency(d.netAmount, d.currency)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {d.canAutoPayout ? (
                            <span className="text-green-700">Auto MM</span>
                          ) : (
                            <span className="text-amber-700" title={d.skipReason}>
                              Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={execute}
                disabled={executing}
                className="px-5 py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60"
              >
                {executing
                  ? "Processing refunds…"
                  : "Confirm & run refunds"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-semibold mb-4">Past refund batches</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-stone-500">No refund runs yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {batches.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap justify-between gap-2 border-b border-stone-100 pb-3"
              >
                <div>
                  <div className="font-medium">{b.project?.title}</div>
                  <div className="text-xs text-stone-500">
                    {new Date(b.createdAt).toLocaleString()} · {b.status}
                  </div>
                </div>
                <div className="text-right text-xs text-stone-600">
                  Donors: {b.donorCount} · OK: {b.successCount} · Fail: {b.failCount} ·
                  Manual: {b.manualCount}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
