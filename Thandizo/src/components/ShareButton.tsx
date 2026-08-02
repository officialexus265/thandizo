"use client";

import { toast } from "sonner";

interface Props {
  title: string;
  text?: string;
  url: string;
  className?: string;
  label?: string;
}

export default function ShareButton({ title, text, url, className, label = "Share" }: Props) {
  async function handleShare() {
    const shareUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (err: any) {
        // AbortError = user cancelled the share sheet, ignore
        if (err?.name !== "AbortError") {
          toast.error("Couldn't share right now");
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <button
      onClick={handleShare}
      className={
        className ||
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
      }
    >
      {label}
    </button>
  );
}
