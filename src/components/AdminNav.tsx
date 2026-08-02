"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SignOutButton from "./SignOutButton";

type NavItem = { href: string; label: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    id: "manage",
    label: "Manage",
    items: [
      { href: "/admin/projects", label: "Projects" },
      { href: "/admin/donations", label: "Donations" },
      { href: "/admin/partners", label: "Partners" },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    items: [
      { href: "/admin/notify", label: "Notify" },
      { href: "/admin/refunds", label: "Refunds" },
      { href: "/admin/search", label: "Search" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/security", label: "Security" },
    ],
  },
];

function initialsFromEmail(email?: string | null) {
  if (!email) return "A";
  const local = email.split("@")[0] || "A";
  const parts = local.replace(/[^a-zA-Z0-9]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export default function AdminNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [q, setQ] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
    setProfileOpen(false);
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
      if (e.key === "Escape") {
        if (open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
        setOpenGroup(null);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Click outside closes dropdowns
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(t)) {
        setProfileOpen(false);
      }
      if (openGroup) {
        const el = groupRefs.current[openGroup];
        if (el && !el.contains(t)) setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openGroup]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function groupActive(g: NavGroup) {
    return g.items.some((i) => isActive(i.href));
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/admin/search?q=${encodeURIComponent(term)}`);
  }

  const avatar = initialsFromEmail(email);

  return (
    <header className="bg-stone-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin"
            className="font-semibold text-lg shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
          >
            thandizo Admin
          </Link>

          {/* Desktop grouped nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Admin">
            <Link
              href="/admin"
              className={`px-2.5 py-1.5 rounded-lg hover:bg-stone-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                pathname === "/admin" ? "text-red-300 font-medium" : ""
              }`}
            >
              Dashboard
            </Link>

            {groups.map((g) => (
              <div
                key={g.id}
                className="relative"
                ref={(el) => {
                  groupRefs.current[g.id] = el;
                }}
              >
                <button
                  type="button"
                  aria-expanded={openGroup === g.id}
                  aria-haspopup="true"
                  onClick={() =>
                    setOpenGroup((cur) => (cur === g.id ? null : g.id))
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-stone-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    groupActive(g) ? "text-red-300 font-medium" : ""
                  }`}
                >
                  {g.label}
                  <svg
                    className={`w-3.5 h-3.5 opacity-70 transition-transform ${
                      openGroup === g.id ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <AnimatePresence>
                  {openGroup === g.id && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1 min-w-[160px] rounded-lg bg-stone-800 border border-stone-700 shadow-xl py-1 z-50"
                    >
                      {g.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setOpenGroup(null)}
                          className={`block px-3 py-2 text-sm hover:bg-stone-700 focus:outline-none focus-visible:bg-stone-700 ${
                            isActive(item.href) ? "text-red-300 font-medium" : ""
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>
        </div>

        <form
          role="search"
          onSubmit={onSearch}
          className="hidden md:flex flex-1 max-w-[180px] lg:max-w-xs"
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

        {/* Profile avatar only (desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0" ref={profileRef}>
          <div className="relative">
            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              onClick={() => setProfileOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-red-700 flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition"
              title={email || "Admin"}
            >
              {avatar}
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-lg bg-stone-800 border border-stone-700 shadow-xl py-1 z-50"
                >
                  <Link
                    href="/"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-stone-700 focus:outline-none focus-visible:bg-stone-700"
                  >
                    View site
                  </Link>
                  <Link
                    href="/admin/settings"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-stone-700 focus:outline-none focus-visible:bg-stone-700"
                  >
                    Settings
                  </Link>
                  <div className="border-t border-stone-700 px-3 py-2">
                    <SignOutButton />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile hamburger */}
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

              <div className="px-4 py-3 flex items-center gap-3 border-b border-stone-800">
                <div
                  className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center text-sm font-semibold"
                  aria-hidden="true"
                >
                  {avatar}
                </div>
                <span className="text-sm text-stone-400">Account</span>
              </div>

              <ul className="px-4 py-2">
                <li>
                  <Link
                    href="/admin"
                    className={`block py-3 px-2 rounded-lg text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                      pathname === "/admin"
                        ? "bg-stone-800 text-red-300 font-medium"
                        : "hover:bg-stone-800"
                    }`}
                  >
                    Dashboard
                  </Link>
                </li>
                {groups.map((g) => (
                  <li key={g.id} className="mt-2">
                    <p className="px-2 text-xs uppercase tracking-wide text-stone-500 mb-1">
                      {g.label}
                    </p>
                    {g.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block py-2.5 px-2 rounded-lg text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                          isActive(item.href)
                            ? "bg-stone-800 text-red-300 font-medium"
                            : "hover:bg-stone-800"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-800 px-4 py-3 space-y-2 text-sm">
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
