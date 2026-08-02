"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Stats = {
  range: number;
  visits: {
    total: number;
    period: number;
    today: number;
    uniqueSessions: number;
  };
  ads: { views: number; clicks: number; ctr: number };
  topPages: { path: string | null; views: number }[];
  daily: { date: string; count: number }[];
  recentEvents: {
    id: string;
    type: string;
    path: string | null;
    label: string | null;
    createdAt: string;
  }[];
  business: {
    donationsSuccess: number;
    donationsPending: number;
    projectsByStatus: Record<string, number>;
    partnerInterestsNew: number;
    raisedByCurrency: { currency: string; total: number; count: number }[];
  };
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1 text-stone-900">{value}</p>
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function AdminStatsPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/stats?range=${range}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load stats");
        setData(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range]);

  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="text-sm text-stone-500 mt-1">
            Site traffic, engagement, and business metrics. Ad views/clicks are ready for when you add ads.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Date range">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                range === d
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-stone-500 text-sm">Loading stats…</p>}
      {error && (
        <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {data && !loading && (
        <div className="space-y-8">
          {/* Visits */}
          <section>
            <h2 className="font-semibold text-stone-800 mb-3">Visits</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Today" value={data.visits.today} />
              <StatCard
                label={`Last ${data.range} days`}
                value={data.visits.period}
              />
              <StatCard
                label="Unique sessions"
                value={data.visits.uniqueSessions}
                hint={`Last ${data.range} days`}
              />
              <StatCard label="All-time page views" value={data.visits.total} />
            </div>
          </section>

          {/* Daily chart (CSS bars — light) */}
          <section>
            <h2 className="font-semibold text-stone-800 mb-3">
              Daily page views
            </h2>
            <div className="bg-white rounded-xl border border-stone-200 p-4 overflow-x-auto">
              <div
                className="flex items-end gap-1 min-h-[120px]"
                style={{ minWidth: Math.max(320, data.daily.length * 14) }}
                role="img"
                aria-label="Daily page views chart"
              >
                {data.daily.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1 min-w-[10px]"
                    title={`${d.date}: ${d.count}`}
                  >
                    <span className="text-[10px] text-stone-400 hidden sm:block">
                      {d.count || ""}
                    </span>
                    <div
                      className="w-full rounded-t bg-red-700/80 hover:bg-red-700 transition"
                      style={{
                        height: `${Math.max(4, (d.count / maxDaily) * 100)}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-2">
                <span>{data.daily[0]?.date}</span>
                <span>{data.daily[data.daily.length - 1]?.date}</span>
              </div>
            </div>
          </section>

          {/* Ads (ready for future) */}
          <section>
            <h2 className="font-semibold text-stone-800 mb-3">
              Ads (ready for future)
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                label="Ad views"
                value={data.ads.views}
                hint={`Last ${data.range} days`}
              />
              <StatCard
                label="Ad clicks"
                value={data.ads.clicks}
                hint={`Last ${data.range} days`}
              />
              <StatCard label="CTR" value={`${data.ads.ctr}%`} hint="Clicks ÷ views" />
            </div>
            <p className="text-xs text-stone-500 mt-2">
              When you add ads, call <code className="bg-stone-100 px-1 rounded">trackAdView</code> /{" "}
              <code className="bg-stone-100 px-1 rounded">trackAdClick</code> from the ad components.
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top pages */}
            <section>
              <h2 className="font-semibold text-stone-800 mb-3">Top pages</h2>
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {data.topPages.length === 0 ? (
                  <p className="p-4 text-sm text-stone-500">
                    No page views yet. Browse the public site to generate data.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone-100 text-sm">
                    {data.topPages.map((p) => (
                      <li
                        key={p.path || "unknown"}
                        className="flex justify-between gap-3 px-4 py-2.5"
                      >
                        <span className="truncate text-stone-700 font-mono text-xs sm:text-sm">
                          {p.path || "/"}
                        </span>
                        <span className="text-stone-500 shrink-0">{p.views}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Business */}
            <section>
              <h2 className="font-semibold text-stone-800 mb-3">Business</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <StatCard
                  label="Successful donations"
                  value={data.business.donationsSuccess}
                />
                <StatCard
                  label="Pending donations"
                  value={data.business.donationsPending}
                />
                <StatCard
                  label="New partner interests"
                  value={data.business.partnerInterestsNew}
                />
                <StatCard
                  label="Active projects"
                  value={data.business.projectsByStatus.ACTIVE || 0}
                />
              </div>
              {data.business.raisedByCurrency.length > 0 && (
                <div className="bg-white rounded-xl border border-stone-200 p-4 text-sm">
                  <p className="text-xs text-stone-500 mb-2">Raised (successful)</p>
                  <ul className="space-y-1">
                    {data.business.raisedByCurrency.map((r) => (
                      <li key={r.currency} className="flex justify-between">
                        <span>
                          {formatCurrency(r.total, r.currency)}
                        </span>
                        <span className="text-stone-400">{r.count} gifts</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 bg-white rounded-xl border border-stone-200 p-4 text-sm">
                <p className="text-xs text-stone-500 mb-2">Projects by status</p>
                <ul className="space-y-1">
                  {Object.entries(data.business.projectsByStatus).map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="font-medium">{v}</span>
                    </li>
                  ))}
                  {Object.keys(data.business.projectsByStatus).length === 0 && (
                    <li className="text-stone-500">No projects yet</li>
                  )}
                </ul>
              </div>
            </section>
          </div>

          {/* Recent events */}
          <section>
            <h2 className="font-semibold text-stone-800 mb-3">Recent events</h2>
            <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-xs text-stone-500">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Path / label</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.recentEvents.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-stone-500 whitespace-nowrap text-xs">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-stone-100">
                          {e.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs truncate max-w-xs">
                        {e.path || e.label || "—"}
                      </td>
                    </tr>
                  ))}
                  {data.recentEvents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-stone-500">
                        No events yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
