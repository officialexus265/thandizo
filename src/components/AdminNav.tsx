"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SignOutButton from "./SignOutButton";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/notify", label: "Notify" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/search", label: "Search" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/security", label: "Security" },
];

export default function AdminNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setOpen(false);
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

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/admin/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="bg-stone-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/admin"
            className="font-semibold text-lg shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
          >
            thandizo Admin
          </Link>
          <nav className="hidden lg:flex flex-wrap gap-3 text-sm" aria-label="Admin">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hover:text-red-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded px-0.5 ${
                  isActive(l.href) ? "text-red-300 font-medium" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <form
          role="search"
          onSubmit={onSearch}
          className="hidden md:flex flex-1 max-w-[200px] lg:max-w-xs"
        >
          <label htmlFor="admin-header-search" className="sr-only">
            Search admin
          </label>
          <input
            id="admin-header-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-white placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          />
        </form>

        <div className="hidden md:flex items-center gap-4 text-sm shrink-0">
          {email && <span className="text-stone-400 truncate max-w-[140px]">{email}</span>}
          <Link
            href="/"
            className="hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
          >
            View site
          </Link>
          <SignOutButton />
        </div>

        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-stone-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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
              className="md:hidden fixed inset-0 top-[52px] bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              id="admin-mobile-menu"
              aria-label="Admin mobile"
              className="md:hidden absolute left-0 right-0 top-full bg-stone-900 border-t border-stone-800 shadow-xl z-50 max-h-[calc(100vh-52px)] overflow-y-auto"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <form role="search" onSubmit={onSearch} className="px-4 pt-3">
                <label htmlFor="admin-mobile-search" className="sr-only">
                  Search
                </label>
                <input
                  id="admin-mobile-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search projects, donors, partners…"
                  className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-white placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                />
              </form>
              <ul className="px-4 py-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block py-3 px-2 rounded-lg text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                        isActive(l.href)
                          ? "bg-stone-800 text-red-300 font-medium"
                          : "hover:bg-stone-800"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-800 px-4 py-3 space-y-2 text-sm">
                {email && <p className="text-stone-400 px-2 truncate">{email}</p>}
                <Link
                  href="/"
                  className="block py-2 px-2 rounded-lg hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  View site
                </Link>
                <div className="px-2 py-2">
                  <SignOutButton />
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
