"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { toast } from "sonner";

/**
 * Flow:
 * 1. Public "Submit project" → /developer/register
 * 2. After login + KYC approved → can use this form (or portal)
 * 3. Unauthenticated visitors landing on /submit are sent to sign up
 */
export default function SubmitProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [categories, setCategories] = useState<
    { id: string; name: string; feePercent: number; requiresReview: boolean }[]
  >([]);
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

  const role = (session?.user as any)?.role;
  const isDeveloper = role === "developer";

  // Not logged in → sign up (this is the agreed flow)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/developer/register?next=/submit");
    }
  }, [status, router]);

  // Logged in as developer → load profile for prefill + KYC gate
  useEffect(() => {
    if (status !== "authenticated" || !isDeveloper) return;

    fetch("/api/developer/verify")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setKycStatus(d.kycStatus || null);
        setForm((f) => ({
          ...f,
          developerName: (session?.user as any)?.name || f.developerName,
          developerEmail: d.email || session?.user?.email || "",
          developerPhone: d.phone || "",
        }));
      })
      .catch(() => {});
  }, [status, isDeveloper, session]);

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
    if (kycStatus !== "APPROVED") {
      toast.error("KYC must be approved before you can submit a project");
      return;
    }
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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-sm text-stone-600">Taking you to sign up…</p>
          <p className="mt-2 text-xs text-stone-500">
            You need a fundraiser account before submitting a project.
          </p>
          <Link href="/developer/register?next=/submit" className="inline-block mt-4 text-sm underline">
            Create account
          </Link>
        </main>
      </>
    );
  }

  // Admin or other role
  if (!isDeveloper) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 text-center space-y-3">
          <h1 className="text-xl font-bold">Fundraiser account required</h1>
          <p className="text-sm text-stone-600">
            Submit a project uses a fundraiser (developer) account, not the admin login.
          </p>
          <Link
            href="/developer/register?next=/submit"
            className="inline-block px-4 py-2 rounded-lg bg-stone-900 text-white text-sm"
          >
            Create fundraiser account
          </Link>
        </main>
      </>
    );
  }

  // KYC not approved yet
  if (kycStatus && kycStatus !== "APPROVED") {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-lg mx-auto px-4 py-12 space-y-4">
          <h1 className="text-2xl font-bold">Almost there</h1>
          <p className="text-sm text-stone-600">
            Your account is signed in, but campaigns can only be submitted after{" "}
            <strong>KYC is approved</strong> (usually up to 3 working days).
          </p>
          <p className="text-sm text-stone-600">
            Current KYC status: <strong>{kycStatus}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/developer/kyc"
              className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium"
            >
              Open KYC
            </Link>
            <Link
              href="/developer/security"
              className="px-4 py-2 rounded-lg border text-sm font-medium"
            >
              Verify email / phone
            </Link>
            <Link href="/developer" className="px-4 py-2 rounded-lg border text-sm">
              Portal home
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold text-stone-900">Submit a project</h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          Your account and KYC are ready. Submit a campaign for admin review. No phone call is
          required — you will be notified by email and SMS.
        </p>

        {done ? (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-lg font-semibold text-green-900">Thank you</p>
            <p className="mt-2 text-sm text-green-800">
              Your project was submitted and is waiting for admin review. Watch your email and SMS
              for updates.
            </p>
            <p className="mt-4 text-xs text-stone-500 italic">Inu ndi thandizo lathu</p>
            <Link
              href="/developer"
              className="inline-block mt-6 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium"
            >
              Go to portal
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 bg-white border border-stone-200 rounded-xl p-6"
          >
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
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Your name *</label>
                <input
                  required
                  value={form.developerName}
                  onChange={(e) => update("developerName", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.developerEmail}
                  readOnly
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={form.developerPhone}
                onChange={(e) => update("developerPhone", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Short description *</label>
              <textarea
                required
                rows={2}
                value={form.shortDesc}
                onChange={(e) => update("shortDesc", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full description *</label>
              <textarea
                required
                rows={5}
                value={form.fullDesc}
                onChange={(e) => update("fullDesc", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Target amount *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.targetAmount}
                  onChange={(e) => update("targetAmount", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
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
              className="w-full py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
