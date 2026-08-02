"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

interface MediaItem {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  caption: string | null;
  sortOrder: number;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  fullDesc: string;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  status: string;
  isPinned: boolean;
  thumbnailUrl: string | null;
  media: MediaItem[];
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const [form, setForm] = useState({
    title: "",
    developerName: "",
    shortDesc: "",
    fullDesc: "",
    targetAmount: "",
    currency: "MWK",
    status: "ACTIVE",
    isPinned: false,
    thumbnailUrl: "",
  });

  async function refreshProject() {
    const data = await fetch(`/api/admin/projects/${id}`).then((r) => r.json());
    if (!data.error) {
      setProject(data);
      setForm((prev) => ({
        ...prev,
        thumbnailUrl: data.thumbnailUrl || "",
      }));
    }
  }

  useEffect(() => {
    fetch(`/api/admin/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push("/admin/projects");
          return;
        }
        setProject(data);
        setForm({
          title: data.title,
          developerName: data.developerName || "",
          shortDesc: data.shortDesc,
          fullDesc: data.fullDesc,
          targetAmount: String(data.targetAmount),
          currency: data.currency,
          status: data.status,
          isPinned: data.isPinned,
          thumbnailUrl: data.thumbnailUrl || "",
        });
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetAmount: Number(form.targetAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Project updated");
      setProject((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadProgress(`Uploading ${i + 1} of ${fileList.length}: ${file.name}`);

      // Size checks
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max ${isVideo ? "10MB" : "5MB"})`);
        failCount++;
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", id);
      // Only set as thumbnail automatically if there is currently no thumbnail and this is an image
      const shouldSetThumb =
        !project?.thumbnailUrl && successCount === 0 && !isVideo && i === 0;
      formData.append("setAsThumbnail", shouldSetThumb ? "true" : "false");

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        successCount++;
      } catch (err: any) {
        toast.error(`${file.name}: ${err.message}`);
        failCount++;
      }
    }

    setUploadProgress("");
    setUploading(false);
    e.target.value = "";

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully`);
      await refreshProject();
    }
    if (failCount > 0 && successCount === 0) {
      toast.error("All uploads failed");
    }
  }

  async function setAsThumbnail(url: string) {
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to set thumbnail");
      toast.success("Thumbnail updated");
      setForm((prev) => ({ ...prev, thumbnailUrl: url }));
      setProject((prev) => (prev ? { ...prev, thumbnailUrl: url } : null));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm("Delete this media?")) return;
    try {
      const res = await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Media deleted");
      await refreshProject();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteProject() {
    if (!confirm("Are you sure you want to delete this entire project? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Project deleted");
      router.push("/admin/projects");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-stone-500">Loading project...</div>;
  }

  if (!project) return null;

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Project</h1>
        <a
          href={`/project/${project.slug}`}
          target="_blank"
          className="text-sm text-red-700 hover:underline"
        >
          View public page →
        </a>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-white rounded-xl border border-stone-200 p-6 mb-8">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            >
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
              Pin to top of landing page
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            Back
          </button>
        </div>
      </form>

      {/* Media Section */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Gallery & Thumbnail</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Upload images or videos (you can select multiple files at once)
          </label>
          <p className="text-xs text-stone-500 mb-2">
            Max 5MB per image · Max 10MB per video
          </p>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleBulkUpload}
            disabled={uploading}
            className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
          {uploading && (
            <p className="text-sm text-stone-600 mt-2 animate-pulse">{uploadProgress || "Uploading..."}</p>
          )}
        </div>

        {project.media.length === 0 ? (
          <p className="text-stone-500 text-sm">
            No media yet. Upload some images — the first image will automatically become the thumbnail.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {project.media.map((m) => {
              const isThumb = project.thumbnailUrl === m.url;
              return (
                <div
                  key={m.id}
                  className={`relative group aspect-square rounded-lg overflow-hidden bg-stone-100 border-2 ${
                    isThumb ? "border-green-600" : "border-transparent"
                  }`}
                >
                  {m.type === "VIDEO" ? (
                    <video src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={m.url} alt="" fill className="object-cover" sizes="200px" />
                  )}

                  {isThumb && (
                    <span className="absolute top-1 left-1 bg-green-700 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      Thumbnail
                    </span>
                  )}

                  {/* Action buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                    {m.type === "IMAGE" && !isThumb && (
                      <button
                        type="button"
                        onClick={() => setAsThumbnail(m.url)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded font-medium"
                      >
                        Set as Thumbnail
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="font-semibold text-red-800 mb-2">Danger zone</h3>
        <p className="text-sm text-red-700 mb-3">
          Deleting a project also deletes all its media and donations.
        </p>
        <button
          type="button"
          onClick={handleDeleteProject}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
        >
          Delete this project
        </button>
      </div>
    </div>
  );
}
