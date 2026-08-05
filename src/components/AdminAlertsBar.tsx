"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type AlertItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: "amber" | "red" | "stone";
};

export default function AdminAlertsBar() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/admin/alerts")
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  async function dismissOne(alertKey: string, count: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", alertKey, count }),
      });
      if (!res.ok) throw new Error("Failed");
      load();
    } catch {
      toast.error("Could not clear alert");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!confirm("Clear all attention items? They will reappear if new ones arrive.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-all" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Attention list cleared");
      load();
    } catch {
      toast.error("Could not clear");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  if (total === 0) return null;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-amber-600 text-white text-sm font-medium px-4 py-2 shadow-lg hover:bg-amber-700"
      >
        {total} pending
      </button>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin/notifications" className="font-semibold text-amber-900 hover:underline">
            Attention
          </Link>
          {items.map((item) => (
            <span
              key={item.id}
              className={`inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-xs font-medium ${
                item.tone === "red"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              <Link href={item.href} className="inline-flex items-center gap-1.5 hover:underline">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1">
                  {item.count}
                </span>
                {item.label}
              </Link>
              <button
                type="button"
                title="Clear this alert"
                disabled={busy}
                onClick={() => dismissOne(item.id, item.count)}
                className="ml-0.5 rounded-full hover:bg-black/10 px-1.5 py-0.5 text-[10px] font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin/notifications" className="text-amber-900 underline">
            Open inbox
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={clearAll}
            className="text-amber-900 font-medium hover:underline disabled:opacity-50"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="text-amber-800/70 hover:text-amber-900"
          >
            Minimize
          </button>
        </div>
      </div>
    </div>
  );
}
