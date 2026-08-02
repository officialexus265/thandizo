"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

function AdminSearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(q);
  const [projects, setProjects] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    setInput(q);
    if (q.trim().length < 2) {
      setProjects([]);
      setDonations([]);
      setPartners([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects || []);
        setDonations(data.donations || []);
        setPartners(data.partners || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <>
      <form action="/admin/search" method="get" role="search" className="mb-8 max-w-xl">
        <label htmlFor="admin-search" className="sr-only">
          Search projects, donors, partners
        </label>
        <div className="flex gap-2">
          <input
            id="admin-search"
            name="q"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search projects, donors, partners…"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            Search
          </button>
        </div>
      </form>

      {loading && (
        <p className="text-sm text-stone-500" role="status">
          Searching…
        </p>
      )}

      {!loading && q.trim().length >= 2 && (
        <div className="space-y-8">
          <section aria-labelledby="admin-projects">
            <h2 id="admin-projects" className="font-semibold mb-3">
              Projects / events ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <p className="text-sm text-stone-500">No matches.</p>
            ) : (
              <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600"
                    >
                      <span>
                        <span className="font-medium">{p.title}</span>
                        <span className="text-stone-400 ml-2 text-xs">{p.status}</span>
                      </span>
                      <span className="text-stone-500 shrink-0">
                        {formatCurrency(Number(p.raisedAmount), p.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="admin-donors">
            <h2 id="admin-donors" className="font-semibold mb-3">
              Donors / donations ({donations.length})
            </h2>
            {donations.length === 0 ? (
              <p className="text-sm text-stone-500">No matches.</p>
            ) : (
              <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
                {donations.map((d) => (
                  <li key={d.id} className="px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="font-medium">
                        {d.isAnonymous || !d.donorName ? "Anonymous" : d.donorName}
                      </span>
                      {(d.email || d.phone) && (
                        <span className="block text-xs text-stone-500">
                          {[d.email, d.phone].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      <Link
                        href={`/admin/projects/${d.projectId}`}
                        className="text-xs text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded"
                      >
                        {d.project?.title}
                      </Link>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(Number(d.amount), d.currency)}
                      </div>
                      <div className="text-xs text-stone-400">{d.status}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="admin-partners">
            <h2 id="admin-partners" className="font-semibold mb-3">
              Partners / developers ({partners.length})
            </h2>
            {partners.length === 0 ? (
              <p className="text-sm text-stone-500">No matches.</p>
            ) : (
              <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
                {partners.map((p) => (
                  <li key={p.id} className="px-4 py-3 text-sm">
                    <span className="font-medium">{p.displayName || p.name}</span>
                    <span className="text-xs text-stone-400 ml-2">{p.status}</span>
                    {(p.email || p.phone) && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        {[p.email, p.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {p.project && (
                      <p className="text-xs text-stone-500">Project: {p.project.title}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function AdminSearchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Search</h1>
      <p className="text-sm text-stone-500 mb-6">
        Find projects (events), donors, and partners / developers.
      </p>
      <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
        <AdminSearchResults />
      </Suspense>
    </div>
  );
}
