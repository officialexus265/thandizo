"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
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

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "thandizo/kyc");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  }

  async function onFile(
    e: ChangeEvent<HTMLInputElement>,
    field: "nationalIdUrl" | "selfieWithIdUrl" | "videoKycUrl"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      e.target.value = "";
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nationalIdUrl || !form.selfieWithIdUrl || !form.videoKycUrl) {
      toast.error("Please upload ID, selfie, and video first");
      return;
    }
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
      toast.success(data.message || "KYC submitted for review");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="max-w-xl">
      <p className="text-sm text-stone-500 mb-4">Verification is done by our admin team only (manual review). Nothing is auto-approved.</p>
      <h1 className="text-2xl font-bold">Identity verification (KYC)</h1>
      <p className="text-sm text-stone-500 mt-1 mb-4">
        Required before any campaign can be published or funds withdrawn. Complete email & phone verification under Security first. Status: <strong>{status}</strong>
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
          <label className="text-sm font-medium">National ID image (max 5MB)</label>
          <input
            type="file"
            accept="image/*"
            disabled={status === "APPROVED"}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("folder", "thandizo/kyc");
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Upload failed");
                setForm((f) => ({ ...f, nationalIdUrl: data.url }));
                toast.success(data.message || "ID uploaded");
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="mt-1 w-full text-sm"
          />
          {form.nationalIdUrl && <p className="text-xs text-green-700 mt-1">ID uploaded</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Selfie holding national ID (max 5MB)</label>
          <input
            type="file"
            accept="image/*"
            disabled={status === "APPROVED"}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("folder", "thandizo/kyc");
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Upload failed");
                setForm((f) => ({ ...f, selfieWithIdUrl: data.url }));
                toast.success("Selfie uploaded");
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="mt-1 w-full text-sm"
          />
          {form.selfieWithIdUrl && <p className="text-xs text-green-700 mt-1">Selfie uploaded</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Verification video (max 10MB)</label>
          <input
            type="file"
            accept="video/*"
            disabled={status === "APPROVED"}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("folder", "thandizo/kyc");
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Upload failed");
                setForm((f) => ({ ...f, videoKycUrl: data.url }));
                toast.success("Video uploaded");
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="mt-1 w-full text-sm"
          />
          {form.videoKycUrl && <p className="text-xs text-green-700 mt-1">Video uploaded</p>}
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
