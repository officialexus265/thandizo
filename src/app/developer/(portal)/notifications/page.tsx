"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Item = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: string;
  description?: string;
};

export default function DeveloperNotificationsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/developer/notifications")
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function dismiss(alertKey: string, count: number) {
    const res = await fetch("/api/developer/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", alertKey, count }),
    });
    if (!res.ok) toast.error("Failed");
    else {
      toast.success("Cleared");
      load();
    }
  }

  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    const res = await fetch("/api/developer/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-all" }),
    });
    if (!res.ok) toast.error("Failed");
    else {
      toast.success("Cleared");
      load();
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-stone-500 mt-1">
            KYC status, draft campaigns, target decisions, and withdrawable funds.
          </p>
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm px-3 py-1.5 rounded-lg border hover:bg-stone-50"
        >
          Clear all
        </button>
      </div>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl p-4">
          No open notifications.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3"
          >
            <div>
              <p className="font-semibold">{item.label}</p>
              {item.description && (
                <p className="text-sm text-stone-500 mt-1">{item.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={item.href}
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-medium"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => dismiss(item.id, item.count)}
                className="px-3 py-1.5 rounded-lg border text-sm"
              >
                Clear
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
