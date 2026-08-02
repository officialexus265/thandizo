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
    adminPhone: "",
    callWindow: "",
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setForm({
            siteName: data.siteName || "thandizo",
            contactEmail: data.contactEmail || "",
            logoUrl: data.logoUrl || "",
            refundFeePercent: data.refundFeePercent ?? 10,
            adminPhone: data.adminPhone || "",
            callWindow: data.callWindow || "",
          });
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
      toast.success("Logo uploaded and saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  if (loading) return <div className="text-center py-20 text-stone-500">Loading...</div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      <form onSubmit={handleSave} className="space-y-5 bg-white rounded-xl border border-stone-200 p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Site name</label>
          <input
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact email</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          />
          <p className="text-xs text-stone-500 mt-1">Used for donor communications and contact.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Logo</label>
          {form.logoUrl && (
            <div className="mb-3 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-stone-200 bg-stone-100">
                <Image src={form.logoUrl} alt="Logo" fill className="object-cover" />
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, logoUrl: "" })}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
            className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
          {uploadingLogo && <p className="text-sm text-stone-500 mt-1">Uploading logo...</p>}
          <p className="text-xs text-stone-500 mt-1">Recommended: square image, max 2MB. Uploaded to Cloudinary.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
