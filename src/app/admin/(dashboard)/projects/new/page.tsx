"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import slugify from "slugify";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    developerName: "",
    shortDesc: "",
    fullDesc: "",
    targetAmount: "",
    currency: "MWK",
    status: "DRAFT",
    isPinned: false,
    categoryId: "",
  });
  const [categories, setCategories] = useState<{ id: string; name: string; feePercent: number; requiresReview: boolean }[]>([]);

  useEffect(() => {
    fetch("/api/public/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCategories(d);
      })
      .catch(() => {});
  }, []);

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          developerName: form.developerName || null,
          targetAmount: Number(form.targetAmount),
          slug: slugify(form.title, { lower: true, strict: true }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      toast.success("Project created");
      router.push(`/admin/projects/${data.id}`);
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create Project</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-stone-200 p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Developer / organiser name</label>
          <input
            value={form.developerName}
            onChange={(e) => update("developerName", e.target.value)}
            placeholder="Who is running this project?"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Short description *</label>
          <input
            required
            value={form.shortDesc}
            onChange={(e) => update("shortDesc", e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            maxLength={160}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Full description *</label>
          <textarea
            required
            rows={6}
            value={form.fullDesc}
            onChange={(e) => update("fullDesc", e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target amount *</label>
            <input
              type="number"
              required
              min="1"
              value={form.targetAmount}
              onChange={(e) => update("targetAmount", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            >
              <option value="MWK">MWK</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.feePercent}% fee{c.requiresReview ? ", review required" : ""})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            >
              <option value="DRAFT">Draft (not public)</option>
              <option value="ACTIVE">Active</option>
              <option value="FUNDED">Funded</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => update("isPinned", e.target.checked)}
                className="rounded"
              />
              Pin to top
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
