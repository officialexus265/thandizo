"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import { formatCurrency } from "@/lib/utils";

interface ProjectHit {
  id: string;
  title: string;
  slug: string;
  developerName?: string | null;
  shortDesc: string;
  thumbnailUrl: string | null;
  status: string;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  donorCount: number;
}

interface PartnerHit {
  id: string;
  name: string;
  displayName: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  message: string | null;
  project: { title: string; slug: string } | null;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectHit[]>([]);
  const [partners, setPartners] = useState<PartnerHit[]>([]);
  const [input, setInput] = useState(q);

  useEffect(() => {
    setInput(q);
    if (q.trim().length < 2) {
      setProjects([]);
      setPartners([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects || []);
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
      <form
        action="/search"
        method="get"
        role="search"
        className="max-w-2xl mx-auto mb-8"
      >
        <label htmlFor="public-search" className="sr-only">
          Search projects and partners
        </label>
        <div className="flex gap-2">
          <input
            id="public-search"
            name="q"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search projects, titles, descriptions, partners…"
            className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            Search
          </button>
        </div>
      </form>

      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="text-center text-stone-500 text-sm">Type at least 2 characters.</p>
      )}

      {loading && (
        <p className="text-center text-stone-500 text-sm" role="status">
          Searching…
        </p>
      )}

      {!loading && q.trim().length >= 2 && (
        <div className="space-y-10">
          <section aria-labelledby="projects-heading">
            <h2 id="projects-heading" className="text-lg font-semibold mb-4">
              Projects ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <p className="text-stone-500 text-sm">No projects matched.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/project/${p.slug}`}
                      className="flex gap-3 p-3 rounded-xl border border-stone-200 bg-white hover:border-red-300 hover:shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {p.thumbnailUrl ? (
                          <Image src={p.thumbnailUrl} alt="" fill className="object-cover" sizes="64px" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 truncate">{p.title}</p>
                        {p.developerName && (
                          <p className="text-xs text-stone-500">by {p.developerName}</p>
                        )}
                        <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">{p.shortDesc}</p>
                        <p className="text-xs text-green-700 mt-1">
                          {formatCurrency(Number(p.raisedAmount), p.currency)} raised
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="partners-heading">
            <h2 id="partners-heading" className="text-lg font-semibold mb-4">
              Partners / developers ({partners.length})
            </h2>
            {partners.length === 0 ? (
              <p className="text-stone-500 text-sm">No partners matched.</p>
            ) : (
              <ul className="space-y-3">
                {partners.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-white"
                  >
                    {p.logoUrl && (
                      <img
                        src={p.logoUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{p.displayName || p.name}</p>
                      {p.project && (
                        <Link
                          href={`/project/${p.project.slug}`}
                          className="text-xs text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded"
                        >
                          {p.project.title}
                        </Link>
                      )}
                      {p.websiteUrl && (
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-stone-500 hover:text-red-700 truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded"
                        >
                          {p.websiteUrl}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {!loading && q.trim().length >= 2 && projects.length === 0 && partners.length === 0 && (
        <p className="text-center text-stone-500 mt-6">No results for “{q}”.</p>
      )}
    </>
  );
}

export default function PublicSearchPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold mb-6 text-center sm:text-left">Search</h1>
        <Suspense fallback={<p className="text-stone-500 text-sm">Loading…</p>}>
          <SearchResults />
        </Suspense>
      </main>
    </>
  );
}
