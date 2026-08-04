"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [open, setOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);

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

  if (!loaded || total === 0 || !open) {
    if (loaded && total > 0 && !open) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-amber-600 text-white text-sm font-medium px-4 py-2 shadow-lg hover:bg-amber-700"
        >
          {total} pending
        </button>
      );
    }
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-amber-900">Attention</span>
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                item.tone === "red"
                  ? "bg-red-100 text-red-800 hover:bg-red-200"
                  : "bg-amber-100 text-amber-900 hover:bg-amber-200"
              }`}
            >
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1">
                {item.count}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-amber-800/70 hover:text-amber-900"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
