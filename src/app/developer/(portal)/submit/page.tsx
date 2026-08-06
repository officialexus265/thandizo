"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

type Cat = { id: string; name: string; requiresReview: boolean; feePercent: number };
type MediaItem = { url: string; publicId?: string; type?: string; caption?: string };

export default function DeveloperSubmitPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [fundraiserName, setFundraiserName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState("MWK");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [publicMedia, setPublicMedia] = useState<MediaItem[]>([]);
  const [reviewDocs, setReviewDocs] = useState<MediaItem[]>([]);

  const selected = categories.find((c) => c.id === categoryId);
  const needsReview = !!selected?.requiresReview;

  useEffect(() => {
    Promise.all([
      fetch("/api/public/categories").then((r) => r.json()),
      fetch("/api/developer/verify").then((r) => r.json()),
    ])
      .then(([cats, verify]) => {
        if (Array.isArray(cats)) setCategories(cats);
        if (verify?.kycStatus) setKycStatus(verify.kycStatus);
        if (verify?.email && !fundraiserName) {
          /* name from session via verify if available */
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function uploadFiles(
    files: FileList | null,
    kind: "thumb" | "public" | "review"
  ) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", kind === "review" ? "thandizo/review" : "thandizo/projects");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        const item: MediaItem = {
          url: data.url,
          publicId: data.publicId,
          type: data.type || "IMAGE",
        };
        if (kind === "thumb") setThumbnailUrl(data.url);
        else if (kind === "public") setPublicMedia((m) => [...m, item]);
        else setReviewDocs((m) => [...m, { ...item, caption: file.name }]);
      }
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (kycStatus !== "APPROVED") {
      toast.error("KYC must be approved first");
      return;
    }
    if (needsReview && reviewDocs.length === 0) {
      toast.error("Upload at least one private document for admin review");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/developer/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          fundraiserName,
          categoryId,
          shortDesc,
          fullDesc,
          targetAmount: Number(targetAmount),
          currency,
          thumbnailUrl: thumbnailUrl || publicMedia[0]?.url || null,
          publicMedia,
          reviewDocs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      toast.success(data.message || "Done");
      router.push(data.needsReview ? "/developer" : `/project/${data.slug}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  if (kycStatus !== "APPROVED") {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Submit a project</h1>
        <p className="text-sm text-stone-600">
          KYC must be approved before you can create a campaign. Current status:{" "}
          <strong>{kycStatus || "unknown"}</strong>
        </p>
        <Link
          href="/developer/kyc"
          className="inline-block px-4 py-2 rounded-lg bg-stone-900 text-white text-sm"
        >
          Go to KYC
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit a project</h1>
        <p className="text-sm text-stone-500 mt-1">
          Medical &amp; Education go to admin for approval. Other categories go live right after
          you submit.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-white border rounded-xl p-4 sm:p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Project name *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fundraiser name *</label>
          <input
            required
            value={fundraiserName}
            onChange={(e) => setFundraiserName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Name shown on the campaign"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.requiresReview ? " (admin review)" : " (goes live)"}
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-xs text-stone-500 mt-1">
              {needsReview
                ? "This category needs admin approval and private supporting documents."
                : "This category publishes immediately after submission."}{" "}
              Platform fee on donations: {selected.feePercent}%
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short description *</label>
          <textarea
            required
            rows={2}
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Full description *</label>
          <textarea
            required
            rows={5}
            value={fullDesc}
            onChange={(e) => setFullDesc(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Target amount *</label>
            <input
              required
              type="number"
              min={1}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="MWK">MWK</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Thumbnail</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => uploadFiles(e.target.files, "thumb")}
            className="text-sm w-full"
          />
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="mt-2 h-24 rounded-lg object-cover" />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Public gallery (images/videos)</label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => uploadFiles(e.target.files, "public")}
            className="text-sm w-full"
          />
          <p className="text-xs text-stone-400 mt-1">Shown to donors on the project page.</p>
          {publicMedia.length > 0 && (
            <ul className="mt-2 text-xs text-stone-600 space-y-1">
              {publicMedia.map((m, i) => (
                <li key={i} className="truncate">
                  {m.type}: {m.url}
                </li>
              ))}
            </ul>
          )}
        </div>

        {needsReview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <label className="block text-sm font-medium text-amber-950">
              Private documents for admin review *
            </label>
            <p className="text-xs text-amber-900">
              Bills, school letters, medical notes, etc. Not shown to the public — admin only.
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => uploadFiles(e.target.files, "review")}
              className="text-sm w-full"
            />
            {reviewDocs.length > 0 && (
              <ul className="text-xs space-y-1">
                {reviewDocs.map((m, i) => (
                  <li key={i}>{m.caption || m.url}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {uploading && <p className="text-sm text-stone-500">Uploading…</p>}

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving
            ? "Submitting…"
            : needsReview
              ? "Submit for admin review"
              : "Publish project"}
        </button>
      </form>
    </div>
  );
}
