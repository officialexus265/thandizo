"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SignOutButton from "./SignOutButton";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/notify", label: "Notify" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/security", label: "Security" },
];

export default function AdminNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <header className="bg-stone-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/admin" className="font-semibold text-lg shrink-0">
            thandizo Admin
          </Link>
          <nav className="hidden md:flex flex-wrap gap-3 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hover:text-red-300 transition ${
                  isActive(l.href) ? "text-red-300 font-medium" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4 text-sm shrink-0">
          {email && <span className="text-stone-400 truncate max-w-[180px]">{email}</span>}
          <Link href="/" className="hover:text-red-300">
            View site
          </Link>
          <SignOutButton />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-stone-800 transition"
        >
          <div className="w-5 flex flex-col gap-1.5">
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
            />
            <motion.nav
              className="md:hidden absolute left-0 right-0 top-full bg-stone-900 border-t border-stone-800 shadow-xl z-50 max-h-[calc(100vh-52px)] overflow-y-auto"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ul className="px-4 py-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block py-3 px-2 rounded-lg text-base transition ${
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
                  className="block py-2 px-2 rounded-lg hover:bg-stone-800"
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
