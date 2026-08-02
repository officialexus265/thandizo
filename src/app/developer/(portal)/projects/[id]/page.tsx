"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function DeveloperProjectManagePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [money, setMoney] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    developerName: "",
    shortDesc: "",
    fullDesc: "",
    workProgress: 0,
    progressNote: "",
    thumbnailUrl: "",
    targetAmount: 0,
    currency: "MWK",
  });
  const [media, setMedia] = useState<any[]>([]);
  const [reqTarget, setReqTarget] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [uploading, setUploading] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/developer/projects/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
        const p = data.project;
        setForm({
          title: p.title,
          developerName: p.developerName || "",
          shortDesc: p.shortDesc,
          fullDesc: p.fullDesc,
          workProgress: p.workProgress || 0,
          progressNote: p.progressNote || "",
          thumbnailUrl: p.thumbnailUrl || "",
          targetAmount: Number(p.targetAmount),
          currency: p.currency,
        });
        setMedia(p.media || []);
        setMoney(data.money);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/developer/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          developerName: form.developerName,
          shortDesc: form.shortDesc,
          fullDesc: form.fullDesc,
          workProgress: form.workProgress,
          progressNote: form.progressNote,
          thumbnailUrl: form.thumbnailUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Saved");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestTargetChange() {
    const n = Number(reqTarget);
    if (!n || n <= 0) {
      toast.error("Enter a valid target");
      return;
    }
    try {
      const res = await fetch("/api/developer/target-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          requestedTarget: n,
          reason: reqReason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success("Target change submitted for admin approval");
      setReqTarget("");
      setReqReason("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("projectId", id);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
      }
      toast.success("Uploaded");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/developer" className="text-sm text-red-700 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">Manage project</h1>
      </div>

      {money && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-stone-500">Collected</p>
            <p className="text-lg font-bold">
              {formatCurrency(money.collected, money.currency)}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-800">Held (not withdrawn)</p>
            <p className="text-lg font-bold text-amber-900">
              {formatCurrency(money.held, money.currency)}
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-800">Available (direct)</p>
            <p className="text-lg font-bold text-green-900">
              {formatCurrency(money.available, money.currency)}
            </p>
          </div>
        </div>
      )}

      <section className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">Project details</h2>
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Developer name</label>
          <input
            value={form.developerName}
            onChange={(e) => setForm({ ...form, developerName: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Short description</label>
          <textarea
            rows={2}
            value={form.shortDesc}
            onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Full description</label>
          <textarea
            rows={6}
            value={form.fullDesc}
            onChange={(e) => setForm({ ...form, fullDesc: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            Work progress: {form.workProgress}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.workProgress}
            onChange={(e) =>
              setForm({ ...form, workProgress: Number(e.target.value) })
            }
            className="mt-1 w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Progress note</label>
          <input
            value={form.progressNote}
            onChange={(e) => setForm({ ...form, progressNote: e.target.value })}
            placeholder="e.g. Foundation complete"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </section>

      <section className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Gallery & thumbnail</h2>
        <input type="file" multiple accept="image/*,video/*" onChange={onUpload} disabled={uploading} />
        {uploading && <p className="text-xs text-stone-500">Uploading…</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {media.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setForm({ ...form, thumbnailUrl: m.url })}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                form.thumbnailUrl === m.url ? "border-red-600" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500">Click an image to set it as thumbnail, then Save.</p>
      </section>

      <section className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Request target change</h2>
        <p className="text-xs text-stone-500">
          Current target: {formatCurrency(form.targetAmount, form.currency)}. Changes need admin
          approval.
        </p>
        <input
          type="number"
          min={1}
          value={reqTarget}
          onChange={(e) => setReqTarget(e.target.value)}
          placeholder="New target amount"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <textarea
          rows={2}
          value={reqReason}
          onChange={(e) => setReqReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={requestTargetChange}
          className="px-4 py-2 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50"
        >
          Submit request
        </button>
      </section>
    </div>
  );
}
