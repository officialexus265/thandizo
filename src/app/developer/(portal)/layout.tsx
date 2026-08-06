"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const nav = [
  { href: "/developer", label: "Dashboard" },
  { href: "/developer/submit", label: "Submit project" },
  { href: "/developer/kyc", label: "KYC" },
  { href: "/developer/withdrawals", label: "Withdraw" },
  { href: "/developer/ledger", label: "Ledger" },
  { href: "/developer/security", label: "Security" },
  { href: "/developer/notifications", label: "Inbox" },
];

export default function DeveloperPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/developer/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "developer") {
      router.replace("/developer/login");
    }
  }, [status, session, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-stone-500">
        Loading portal…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-stone-900 text-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/developer" className="font-semibold shrink-0">
            Fundraiser portal
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3 text-sm flex-wrap justify-end">
            {nav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href
                    ? "text-white font-medium"
                    : "text-stone-300 hover:text-white"
                }
              >
                {l.label}
              </Link>
            ))}
            <span className="text-stone-500 text-xs max-w-[100px] truncate">
              {session?.user?.name}
            </span>
            <Link href="/" className="text-stone-300 hover:text-red-300">
              Site
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-stone-300 hover:text-white"
            >
              Sign out
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-stone-800"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
        </div>

        {open && (
          <nav className="md:hidden border-t border-stone-700 px-4 py-3 space-y-1">
            {nav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block py-2 text-sm text-stone-200 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/" className="block py-2 text-sm text-stone-400">
              View public site
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block py-2 text-sm text-stone-400"
            >
              Sign out
            </button>
          </nav>
        )}
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
