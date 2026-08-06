"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({
    siteName: "thandizo",
    contactEmail: "",
    logoUrl: "",
    refundFeePercent: 10,
    withdrawalFeePercent: 0,
    minWithdrawalAmount: 1000,
    adminPhone: "",
    adminWhatsapp: "",
    callWindow: "",
    largeTargetThreshold: 500000,
    registrationsEnabled: true,
    submissionsEnabled: true,
    withdrawalsEnabled: true,
    captchaRequired: false,
    maintenanceMode: false,
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setForm((prev) => ({
            ...prev,
            siteName: data.siteName || "thandizo",
            contactEmail: data.contactEmail || "",
            logoUrl: data.logoUrl || "",
            refundFeePercent: data.refundFeePercent ?? 10,
            withdrawalFeePercent: data.withdrawalFeePercent ?? 0,
            minWithdrawalAmount: data.minWithdrawalAmount ?? 1000,
            adminPhone: data.adminPhone || "",
            adminWhatsapp: data.adminWhatsapp || "",
            callWindow: data.callWindow || "",
            largeTargetThreshold: data.largeTargetThreshold ?? 500000,
            registrationsEnabled: data.registrationsEnabled ?? true,
            submissionsEnabled: data.submissionsEnabled ?? true,
            withdrawalsEnabled: data.withdrawalsEnabled ?? true,
            captchaRequired: data.captchaRequired ?? false,
            maintenanceMode: data.maintenanceMode ?? false,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/upload/logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((prev) => ({ ...prev, logoUrl: data.url }));
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  function toggle(key: keyof typeof form) {
    setForm((f) => ({ ...f, [key]: !f[key] }));
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  const toggles: { key: keyof typeof form; label: string; hint: string }[] = [
    {
      key: "maintenanceMode",
      label: "Maintenance mode",
      hint: "Public site shows a maintenance message; critical actions blocked",
    },
    {
      key: "registrationsEnabled",
      label: "Fundraiser registrations",
      hint: "Allow new fundraiser sign-ups",
    },
    {
      key: "submissionsEnabled",
      label: "Project submissions",
      hint: "Allow KYC-approved users to create campaigns",
    },
    {
      key: "withdrawalsEnabled",
      label: "Withdrawals",
      hint: "Allow fundraisers to request mobile-money withdrawals",
    },
    {
      key: "captchaRequired",
      label: "Require CAPTCHA",
      hint: "Force Turnstile when keys are configured",
    },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site settings</h1>
        <p className="text-sm text-stone-500 mt-1">Branding, fees, and feature toggles</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-white rounded-xl border p-4 sm:p-6">
        <section className="space-y-3">
          <h2 className="font-semibold text-sm">Feature toggles</h2>
          {toggles.map((t) => (
            <label
              key={String(t.key)}
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-stone-50"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={!!form[t.key]}
                onChange={() => toggle(t.key)}
              />
              <span>
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-stone-500">{t.hint}</span>
              </span>
            </label>
          ))}
        </section>

        <div>
          <label className="block text-sm font-medium mb-1">Site name</label>
          <input
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contact email</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Logo</label>
          {form.logoUrl && (
            <div className="relative w-16 h-16 mb-2">
              <Image src={form.logoUrl} alt="Logo" fill className="object-cover rounded-full" />
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
          {uploadingLogo && <p className="text-sm text-stone-500">Uploading…</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Withdrawal fee %</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.1}
              value={form.withdrawalFeePercent}
              onChange={(e) =>
                setForm({ ...form, withdrawalFeePercent: Number(e.target.value) })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min withdrawal (MWK)</label>
            <input
              type="number"
              min={0}
              value={form.minWithdrawalAmount}
              onChange={(e) =>
                setForm({ ...form, minWithdrawalAmount: Number(e.target.value) })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Admin phone / WhatsApp</label>
          <input
            value={form.adminWhatsapp || form.adminPhone}
            onChange={(e) =>
              setForm({ ...form, adminWhatsapp: e.target.value, adminPhone: e.target.value })
            }
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
