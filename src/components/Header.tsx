"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  logoUrl?: string | null;
  siteName?: string;
}

const links = [
  { href: "/", label: "Projects" },
  { href: "/donations", label: "Donations" },
  { href: "/search", label: "Search" },
  { href: "/submit", label: "Submit project" },
  { href: "/legal", label: "Trust" },
];

export default function Header({ logoUrl: logoProp, siteName: nameProp }: HeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(logoProp ?? null);
  const [siteName, setSiteName] = useState(nameProp || "thandizo");
  const buttonRef = useRef<HTMLButtonElement>(null);

  // If parent didn't pass logo (e.g. client-only search page), load from API
  useEffect(() => {
    if (logoProp) {
      setLogoUrl(logoProp);
      if (nameProp) setSiteName(nameProp);
      return;
    }
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.siteName) setSiteName(data.siteName);
      })
      .catch(() => {});
  }, [logoProp, nameProp]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 640) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-stone-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded-lg"
          onClick={() => setOpen(false)}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center font-bold text-lg shrink-0">
              {siteName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-lg sm:text-xl font-semibold tracking-tight truncate">
            {siteName}
          </span>
        </Link>

        <form
          role="search"
          onSubmit={onSearch}
          className="hidden md:flex flex-1 max-w-xs mx-4"
        >
          <label htmlFor="header-search" className="sr-only">
            Search projects and partners
          </label>
          <input
            id="header-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-white placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          />
        </form>

        <nav className="hidden sm:flex items-center gap-4 text-sm shrink-0" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-red-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded px-1"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 transition font-medium text-sm whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
          >
            Dashboard
          </Link>
        </nav>

        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-stone-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <div className="w-5 flex flex-col gap-1.5" aria-hidden="true">
            <span
              className={`block h-0.5 bg-white rounded transition-transform duration-200 ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 bg-white rounded transition-opacity duration-200 ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 bg-white rounded transition-transform duration-200 ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="sm:hidden fixed inset-0 top-[57px] bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              id="mobile-menu"
              aria-label="Mobile"
              className="sm:hidden absolute left-0 right-0 top-full bg-stone-900 border-t border-stone-800 shadow-xl z-50"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <form role="search" onSubmit={onSearch} className="px-4 pt-3">
                <label htmlFor="mobile-search" className="sr-only">
                  Search projects and partners
                </label>
                <input
                  id="mobile-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search projects, partners…"
                  className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-white placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                />
              </form>
              <ul className="px-4 py-3 space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 px-2 rounded-lg text-base hover:bg-stone-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block py-3 px-2 rounded-lg text-base font-medium text-red-300 hover:bg-stone-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
