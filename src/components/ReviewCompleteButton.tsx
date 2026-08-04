"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ReviewCompleteButton({
  projectId,
  reviewRequired,
  reviewCompleted,
}: {
  projectId: string;
  reviewRequired: boolean;
  reviewCompleted: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!reviewRequired || reviewCompleted) {
    if (reviewCompleted) {
      return (
        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 font-medium">
          Review completed
        </span>
      );
    }
    return null;
  }

  async function mark() {
    if (
      !confirm(
        "Mark human review as completed? Only do this after the call / checklist for medical, large appeals, or large targets."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-review" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Review marked complete — you can Publish now");
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
      onClick={mark}
      disabled={loading}
      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-60"
    >
      {loading ? "…" : "Mark review done"}
    </button>
  );
}
