"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  id: string;
  submittedName: string;
  isPublic: boolean;
  displayName: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
}

export default function PromotePartnerButton({
  id,
  submittedName,
  isPublic,
  displayName,
  logoUrl,
  websiteUrl,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: displayName || submittedName,
    logoUrl: logoUrl || "",
    websiteUrl: websiteUrl || "",
  });

  async function save(nextIsPublic: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: nextIsPublic,
          displayName: form.displayName,
          logoUrl: form.logoUrl,
          websiteUrl: form.websiteUrl,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(nextIsPublic ? "Partner is now public" : "Partner hidden from public listing");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Couldn't update partner");
    } finally {
      setSaving(false);
    }
  }

  if (isPublic) {
    return (
      <button
        onClick={() => save(false)}
        disabled={saving}
        className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800 transition"
        title="Click to unpublish"
      >
        Public ✓
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-2 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-100 transition"
      >
        Promote
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-lg mb-4">Promote to public partner</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Display name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Logo URL (optional)</label>
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Website URL (optional)</label>
                <input
                  type="text"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving || !form.displayName}
                className="flex-1 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Make public"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
