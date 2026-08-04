"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KYC_SCRIPT_EN, KYC_SCRIPT_NY } from "@/lib/legal";

export default function DeveloperKycPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("NOT_STARTED");
  const [form, setForm] = useState({
    fullLegalName: "",
    nationalIdNumber: "",
    nationalIdUrl: "",
    selfieWithIdUrl: "",
    videoKycUrl: "",
    videoLanguage: "EN",
  });

  useEffect(() => {
    fetch("/api/developer/kyc")
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) {
          setStatus(d.kycStatus || "NOT_STARTED");
          setForm({
            fullLegalName: d.fullLegalName || "",
            nationalIdNumber: d.nationalIdNumber || "",
            nationalIdUrl: d.nationalIdUrl || "",
            selfieWithIdUrl: d.selfieWithIdUrl || "",
            videoKycUrl: d.videoKycUrl || "",
            videoLanguage: d.videoLanguage || "EN",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/developer/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setStatus(data.kycStatus);
      toast.success("KYC submitted for review");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Identity verification (KYC)</h1>
      <p className="text-sm text-stone-500 mt-1 mb-4">
        Required before a campaign can be published. Status: <strong>{status}</strong>
      </p>

      {status === "APPROVED" && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          KYC approved. Admin can publish after any required human review (medical / large targets).
        </p>
      )}

      <div className="rounded-xl border bg-stone-50 p-4 text-xs text-stone-700 mb-6 space-y-2">
        <p className="font-semibold">Video script — read clearly on camera</p>
        <p className="whitespace-pre-wrap">
          {form.videoLanguage === "NY" ? KYC_SCRIPT_NY : KYC_SCRIPT_EN}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-white border rounded-xl p-5">
        <div>
          <label className="text-sm font-medium">Full legal name (as on national ID)</label>
          <input
            required
            value={form.fullLegalName}
            onChange={(e) => setForm({ ...form, fullLegalName: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            disabled={status === "APPROVED"}
          />
        </div>
        <div>
          <label className="text-sm font-medium">National ID number</label>
          <input
            required
            value={form.nationalIdNumber}
            onChange={(e) => setForm({ ...form, nationalIdNumber: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            disabled={status === "APPROVED"}
          />
        </div>
        <div>
          <label className="text-sm font-medium">National ID image URL</label>
          <input
            required
            value={form.nationalIdUrl}
            onChange={(e) => setForm({ ...form, nationalIdUrl: e.target.value })}
            placeholder="Cloudinary or secure image URL"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            disabled={status === "APPROVED"}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Selfie holding national ID — URL</label>
          <input
            required
            value={form.selfieWithIdUrl}
            onChange={(e) => setForm({ ...form, selfieWithIdUrl: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            disabled={status === "APPROVED"}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Verification video URL</label>
          <input
            required
            value={form.videoKycUrl}
            onChange={(e) => setForm({ ...form, videoKycUrl: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            disabled={status === "APPROVED"}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Script language</label>
          <select
            value={form.videoLanguage}
            onChange={(e) => setForm({ ...form, videoLanguage: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            disabled={status === "APPROVED"}
          >
            <option value="EN">English</option>
            <option value="NY">Chichewa</option>
          </select>
        </div>
        {status !== "APPROVED" && (
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit KYC for review"}
          </button>
        )}
      </form>
    </div>
  );
}
