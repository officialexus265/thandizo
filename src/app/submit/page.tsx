"use client";

import { useState, useEffect, FormEvent } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { toast } from "sonner";

export default function SubmitProjectPage() {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; feePercent: number; requiresReview: boolean }[]>([]);
  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    developerName: "",
    developerEmail: "",
    developerPhone: "",
    shortDesc: "",
    fullDesc: "",
    targetAmount: "",
    currency: "MWK",
  });

  useEffect(() => {
    fetch("/api/public/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCategories(d);
      })
      .catch(() => {});
  }, []);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetAmount: Number(form.targetAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setDone(true);
      toast.success("Project submitted for review");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold text-stone-900">Submit a project</h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          Developers and organisers can propose a project for Thandizo. An admin will review it.
          If approved, you will receive an email with the admin’s phone number so you can call and
          schedule the next steps.
        </p>

        {done ? (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-lg font-semibold text-green-900">Thank you</p>
            <p className="mt-2 text-sm text-green-800">
              Your project was submitted and is waiting for admin review. Watch your email for
              updates. If approved, the email will ask you to call the admin on their phone number
              to schedule a conversation.
            </p>
            <p className="mt-4 text-xs text-stone-500 italic">Inu ndi thandizo lathu</p>
            <Link
              href="/"
              className="inline-block mt-6 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 bg-white border border-stone-200 rounded-xl p-6">
            <div>
              <label className="block text-sm font-medium mb-1">Project title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Your name (developer / organiser) *</label>
              <input
                required
                value={form.developerName}
                onChange={(e) => update("developerName", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.developerEmail}
                  onChange={(e) => update("developerEmail", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.developerPhone}
                  onChange={(e) => update("developerPhone", e.target.value)}
                  placeholder="For the admin to reach you"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.feePercent}% platform fee
                    {c.requiresReview ? " · human review required" : ""})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Short description *</label>
              <textarea
                required
                rows={2}
                value={form.shortDesc}
                onChange={(e) => update("shortDesc", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full description *</label>
              <textarea
                required
                rows={6}
                value={form.fullDesc}
                onChange={(e) => update("fullDesc", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target amount *</label>
                <input
                  required
                  type="number"
                  min={1}
                  step="any"
                  value={form.targetAmount}
                  onChange={(e) => update("targetAmount", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
                >
                  <option value="MWK">MWK</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              {saving ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
