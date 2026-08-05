"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type AlertItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: string;
  description?: string;
};

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [allItems, setAllItems] = useState<AlertItem[]>([]);
  const [failedLogs, setFailedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/alerts")
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setAllItems(Array.isArray(d.allItems) ? d.allItems : []);
        setFailedLogs(Array.isArray(d.recentFailedLogs) ? d.recentFailedLogs : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function dismiss(alertKey: string, count: number) {
    const res = await fetch("/api/admin/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", alertKey, count }),
    });
    if (!res.ok) toast.error("Failed to clear");
    else {
      toast.success("Cleared");
      load();
    }
  }

  async function clearAll() {
    if (!confirm("Clear all attention items?")) return;
    const res = await fetch("/api/admin/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-all" }),
    });
    if (!res.ok) toast.error("Failed");
    else {
      toast.success("All cleared");
      load();
    }
  }

  async function resetAll() {
    const res = await fetch("/api/admin/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (!res.ok) toast.error("Failed");
    else {
      toast.success("Alerts restored");
      load();
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-stone-500 mt-1">
            Follow up on KYC, submissions, reviews, and delivery issues. Clear items after you
            handle them — they return if new ones appear.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-stone-50"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="px-3 py-1.5 rounded-lg border text-sm text-stone-600 hover:bg-stone-50"
          >
            Show all again
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-sm text-green-900">
          No open attention items. You’re caught up.
        </div>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold text-stone-900">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 text-amber-900 text-xs mr-2 px-1.5">
                  {item.count}
                </span>
                {item.label}
              </p>
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
                className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-stone-50"
              >
                Clear
              </button>
            </div>
          </li>
        ))}
      </ul>

      {allItems.length > items.length && (
        <p className="text-xs text-stone-500">
          {allItems.length - items.length} item(s) cleared earlier (will show again if counts
          increase).
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent failed / skipped messages</h2>
        {failedLogs.length === 0 ? (
          <p className="text-sm text-stone-500">None logged recently.</p>
        ) : (
          <ul className="space-y-2">
            {failedLogs.map((l) => (
              <li key={l.id} className="bg-white border rounded-lg px-3 py-2 text-sm">
                <span className="text-xs font-medium uppercase text-stone-500">{l.type}</span> →{" "}
                {l.recipient}
                <p className="text-xs text-red-700 break-all mt-0.5">{l.status}</p>
                <p className="text-xs text-stone-400">
                  {new Date(l.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/notify" className="inline-block mt-3 text-sm text-red-700 underline">
          Test email / SMS →
        </Link>
      </section>
    </div>
  );
}
