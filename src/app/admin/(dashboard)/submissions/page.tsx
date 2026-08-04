"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Sub = {
  id: string;
  title: string;
  developerName: string;
  developerEmail: string;
  developerPhone: string | null;
  shortDesc: string;
  fullDesc: string;
  targetAmount: number;
  currency: string;
  status: string;
  adminNotes: string | null;
  scheduledNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  approvedProjectId: string | null;
};

export default function AdminSubmissionsPage() {
  const [list, setList] = useState<Sub[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sub | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [scheduledNote, setScheduledNote] = useState("");
  const [createDraft, setCreateDraft] = useState(true);
  const [acting, setActing] = useState(false);

  function load() {
    setLoading(true);
    const q = filter ? `?status=${filter}` : "";
    fetch(`/api/admin/submissions${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setList(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function review(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "approve") {
      const ok = confirm(
        "Approve this submission? A DRAFT project will be created (not public). The developer will get an email with your phone number and portal access. Publish only after the call."
      );
      if (!ok) return;
    }
    setActing(true);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action,
          adminNotes: adminNotes || null,
          scheduledNote: scheduledNote || null,
          createDraftProject: createDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        action === "approve"
          ? "Approved — email sent to developer"
          : "Rejected — email sent to developer"
      );
      setSelected(null);
      setAdminNotes("");
      setScheduledNote("");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Project submissions</h1>
      <p className="text-sm text-stone-500 mb-6">
        Developers submit projects for review. On approve, they get an email with your phone number
        and are asked to call you to schedule next steps. Set your phone under Settings.
      </p>

      <div className="flex gap-2 mb-4">
        {["PENDING", "APPROVED", "REJECTED", ""].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              filter === s
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white border-stone-300"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {list.length === 0 && !loading && (
            <li className="p-4 text-sm text-stone-500">No submissions.</li>
          )}
          {list.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(s);
                  setAdminNotes(s.adminNotes || "");
                  setScheduledNote(s.scheduledNote || "");
                }}
                className={`w-full text-left px-4 py-3 hover:bg-stone-50 ${
                  selected?.id === s.id ? "bg-stone-50" : ""
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-sm">{s.title}</span>
                  <span className="text-xs text-stone-400 shrink-0">{s.status}</span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {s.developerName} · {s.developerEmail}
                </p>
                <p className="text-xs text-stone-400">
                  {formatCurrency(Number(s.targetAmount), s.currency)} ·{" "}
                  {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          {!selected ? (
            <p className="text-sm text-stone-500">Select a submission to review.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <p>
                <span className="text-stone-500">Developer:</span> {selected.developerName}
              </p>
              <p>
                <span className="text-stone-500">Email:</span>{" "}
                <a className="text-red-700 hover:underline" href={`mailto:${selected.developerEmail}`}>
                  {selected.developerEmail}
                </a>
              </p>
              {selected.developerPhone && (
                <p>
                  <span className="text-stone-500">Phone:</span> {selected.developerPhone}
                </p>
              )}
              <p>
                <span className="text-stone-500">Target:</span>{" "}
                {formatCurrency(Number(selected.targetAmount), selected.currency)}
              </p>
              <div>
                <p className="text-stone-500 mb-1">Short description</p>
                <p>{selected.shortDesc}</p>
              </div>
              <div>
                <p className="text-stone-500 mb-1">Full description</p>
                <p className="whitespace-pre-wrap text-stone-700">{selected.fullDesc}</p>
              </div>

              {selected.status === "PENDING" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Note for developer (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Suggested call time / schedule note (included in approval email)
                    </label>
                    <textarea
                      rows={2}
                      value={scheduledNote}
                      onChange={(e) => setScheduledNote(e.target.value)}
                      placeholder="e.g. Please call Tuesday or Wednesday morning CAT"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={createDraft}
                      onChange={(e) => setCreateDraft(e.target.checked)}
                    />
                    Create draft project (not public until you Publish after the call)
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => review("approve")}
                      className="flex-1 py-2 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-60"
                    >
                      Approve & email
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => review("reject")}
                      className="flex-1 py-2 rounded-lg border border-stone-300 font-medium hover:bg-stone-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}
              {selected.status !== "PENDING" && (
                <p className="text-stone-500 text-xs">
                  Reviewed {selected.reviewedAt && new Date(selected.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
