"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function TargetRequestsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/target-requests")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setList(d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch("/api/admin/target-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(action === "approve" ? "Approved" : "Rejected");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Target change requests</h1>
      <p className="text-sm text-stone-500 mb-6">
        Developers cannot change targets directly. Approve or reject their requests here.
      </p>
      {loading && <p className="text-sm text-stone-500">Loading…</p>}
      <ul className="space-y-3">
        {list.map((r) => (
          <li
            key={r.id}
            className="bg-white border border-stone-200 rounded-xl p-4 text-sm"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold">{r.project?.title}</p>
                <p className="text-xs text-stone-500">
                  {r.developer?.name} · {r.developer?.email}
                </p>
                <p className="mt-1">
                  {formatCurrency(Number(r.currentTarget), r.project?.currency || "MWK")} →{" "}
                  <strong>
                    {formatCurrency(Number(r.requestedTarget), r.project?.currency || "MWK")}
                  </strong>
                </p>
                {r.reason && <p className="text-stone-600 mt-1">{r.reason}</p>}
                <p className="text-xs text-stone-400 mt-1">{r.status}</p>
              </div>
              {r.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => act(r.id, "approve")}
                    className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-medium"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act(r.id, "reject")}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
        {!loading && list.length === 0 && (
          <li className="text-stone-500 text-sm">No requests yet.</li>
        )}
      </ul>
    </div>
  );
}
