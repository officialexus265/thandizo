"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  feePercent: number;
  requiresReview: boolean;
  active: boolean;
  sortOrder: number;
};

export default function AdminCategoriesPage() {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("8");
  const [newReview, setNewReview] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setList(d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(c: Category) {
    setSavingId(c.id);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: c.id,
          name: c.name,
          feePercent: c.feePercent,
          requiresReview: c.requiresReview,
          active: c.active,
          description: c.description,
          sortOrder: c.sortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Saved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  }

  async function create() {
    if (!newName.trim()) {
      toast.error("Name required");
      return;
    }
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          feePercent: Number(newFee) || 0,
          requiresReview: newReview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      toast.success("Category created");
      setNewName("");
      setNewFee("8");
      setNewReview(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function updateLocal(id: string, patch: Partial<Category>) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories & fees</h1>
      <p className="text-sm text-stone-500 mt-1 mb-6">
        Platform fee % is taken from each successful donation (shown to donors). Categories marked
        “requires review” need human review before Publish. Large targets also force review.
      </p>

      <div className="bg-white border rounded-xl p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-sm">Add category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={50}
            step="0.1"
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
            placeholder="Fee %"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newReview}
              onChange={(e) => setNewReview(e.target.checked)}
            />
            Requires human review
          </label>
          <button
            type="button"
            onClick={create}
            className="rounded-lg bg-stone-900 text-white text-sm font-medium py-2"
          >
            Create
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="space-y-3">
        {list.map((c) => (
          <div
            key={c.id}
            className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-sm"
          >
            <div className="md:col-span-2">
              <label className="text-xs text-stone-500">Name</label>
              <input
                value={c.name}
                onChange={(e) => updateLocal(c.id, { name: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500">Fee %</label>
              <input
                type="number"
                min={0}
                max={50}
                step="0.1"
                value={c.feePercent}
                onChange={(e) =>
                  updateLocal(c.id, { feePercent: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={c.requiresReview}
                onChange={(e) => updateLocal(c.id, { requiresReview: e.target.checked })}
              />
              Review required
            </label>
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={c.active}
                onChange={(e) => updateLocal(c.id, { active: e.target.checked })}
              />
              Active
            </label>
            <button
              type="button"
              disabled={savingId === c.id}
              onClick={() => save(c)}
              className="rounded-lg bg-red-700 text-white py-2 font-medium disabled:opacity-60"
            >
              {savingId === c.id ? "…" : "Save"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
