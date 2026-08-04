"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PublishProjectButton({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status !== "DRAFT") return null;

  async function publish() {
    if (
      !confirm(
        "Publish this project? It will appear on the public site and donors can fund it. Only do this after the developer call and checklist."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      toast.success("Project published — now public");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={publish}
      disabled={loading}
      className="px-2.5 py-1 rounded-lg bg-green-700 text-white text-xs font-medium hover:bg-green-800 disabled:opacity-60"
    >
      {loading ? "…" : "Publish"}
    </button>
  );
}
