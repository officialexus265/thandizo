"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  logoUrl?: string | null;
  siteName?: string;
}

const links = [
  { href: "/", label: "Projects" },
  { href: "/donations", label: "Donations" },
];

export default function Header({ logoUrl, siteName = "thandizo" }: HeaderProps) {
  const [open, setOpen] = useState(false);

  // Close menu on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 640) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-stone-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0" onClick={() => setOpen(false)}>
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
              T
            </div>
          )}
          <span className="text-lg sm:text-xl font-semibold tracking-tight truncate">
            {siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm shrink-0">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-red-300 transition">
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 transition font-medium text-sm whitespace-nowrap"
          >
            Dashboard
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-stone-800 transition"
        >
          <span className="sr-only">Menu</span>
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

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="sm:hidden fixed inset-0 top-[57px] bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              className="sm:hidden absolute left-0 right-0 top-full bg-stone-900 border-t border-stone-800 shadow-xl z-50"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ul className="px-4 py-3 space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 px-2 rounded-lg text-base hover:bg-stone-800 transition"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block py-3 px-2 rounded-lg text-base font-medium text-red-300 hover:bg-stone-800 transition"
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
