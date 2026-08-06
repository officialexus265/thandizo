"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function AdminKycPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/kyc")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setList(d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(action: "approve" | "reject") {
    if (!selected) return;
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, notes: notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(action === "approve" ? "KYC approved" : "KYC rejected");
      setSelected(null);
      setNotes("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const pending = list.filter((x) => x.kycStatus === "PENDING");

  return (
    <div>
      <h1 className="text-2xl font-bold">Fundraiser KYC</h1>
      <p className="text-sm text-stone-500 mt-1 mb-6">
        Every fundraiser must submit national ID, selfie holding ID, and a video reading the
        verification script (English or Chichewa). Approve only if documents match. Medical and
        large appeals still need campaign-level human review before Publish.
      </p>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}
      <p className="text-sm mb-3">
        <span className="font-medium text-amber-800">{pending.length} pending</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ul className="bg-white border rounded-xl divide-y">
          {list.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(d);
                  setNotes(d.kycNotes || "");
                }}
                className="w-full text-left px-4 py-3 hover:bg-stone-50 text-sm"
              >
                <span className="font-medium">{d.fullLegalName || d.name}</span>
                <span className="text-xs text-stone-400 ml-2">{d.kycStatus}{d.kycAutoScore != null ? ` · auto ${d.kycAutoScore} (${d.kycAutoDecision || "—"})` : ""}</span>
                <p className="text-xs text-stone-500">{d.email}</p>
              </button>
            </li>
          ))}
          {!loading && list.length === 0 && (
            <li className="p-4 text-sm text-stone-500">No KYC submissions yet.</li>
          )}
        </ul>

        <div className="bg-white border rounded-xl p-5 text-sm">
          {!selected ? (
            <p className="text-stone-500">Select a fundraiser to review KYC.</p>
          ) : (
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">{selected.fullLegalName || selected.name}</h2>
              <p>Email: {selected.email}</p>
              <p>Phone: {selected.phone || "—"}</p>
              <p>ID number: {selected.nationalIdNumber || "—"}</p>
              <p>Video language: {selected.videoLanguage === "NY" ? "Chichewa" : "English"}</p>
              <div className="grid grid-cols-2 gap-2">
                {selected.nationalIdUrl && (
                  <a href={selected.nationalIdUrl} target="_blank" rel="noreferrer" className="text-red-700 underline">
                    Open national ID
                  </a>
                )}
                {selected.selfieWithIdUrl && (
                  <a href={selected.selfieWithIdUrl} target="_blank" rel="noreferrer" className="text-red-700 underline">
                    Open selfie + ID
                  </a>
                )}
                {selected.videoKycUrl && (
                  <a href={selected.videoKycUrl} target="_blank" rel="noreferrer" className="text-red-700 underline col-span-2">
                    Open KYC video
                  </a>
                )}
              </div>
              {selected.kycAutoScore != null && (
                <div className="rounded-lg border bg-stone-50 p-3 text-sm space-y-1">
                  <p className="font-medium">Automated verification</p>
                  <p>
                    Score: <strong>{selected.kycAutoScore}</strong> · Decision:{" "}
                    <strong>{selected.kycAutoDecision || "—"}</strong>
                  </p>
                  {selected.kycAutoReport && (
                    <ul className="text-xs text-stone-600 list-disc pl-4 space-y-0.5">
                      {(() => {
                        try {
                          const r = JSON.parse(selected.kycAutoReport);
                          return (r.checks || []).map((c: any) => (
                            <li key={c.id}>
                              {c.passed ? "✓" : "✗"} {c.label}: {c.detail}
                            </li>
                          ));
                        } catch {
                          return null;
                        }
                      })()}
                    </ul>
                  )}
                </div>
              )}
              {selected.projects?.length > 0 && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Campaigns</p>
                  <ul className="text-xs space-y-1">
                    {selected.projects.map((p: any) => (
                      <li key={p.id}>
                        {p.title} · {p.status} ·{" "}
                        {formatCurrency(Number(p.targetAmount), p.currency)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.kycStatus === "PENDING" && (
                <>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional, sent on reject)"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => act("approve")}
                      className="flex-1 py-2 rounded-lg bg-green-700 text-white font-medium"
                    >
                      Approve KYC
                    </button>
                    <button
                      type="button"
                      onClick={() => act("reject")}
                      className="flex-1 py-2 rounded-lg border font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
