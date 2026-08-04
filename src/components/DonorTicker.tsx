"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface TickerItem {
  id: string;
  donorName: string | null;
  isAnonymous: boolean;
  amount: number;
  currency: string;
  projectTitle: string;
}

const SHOW_MS = 4000;
const HIDE_MS = 2500;
const POLL_MS = 60000;

export default function DonorTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [index, setIndex] = useState(0);
  const [showing, setShowing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Load recent donations
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/donations/recent");
        if (!res.ok) return;
        const data: TickerItem[] = await res.json();
        if (cancelled || !data?.length) return;

        // Prefer newest first; keep a short list
        const next = data.slice(0, 12);
        setItems(next);

        // On first load, start the cycle
        if (next.length && !seenIds.current.size) {
          next.forEach((d) => seenIds.current.add(d.id));
        }
      } catch {
        /* ignore */
      }
    }

    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  // Show → hide → advance cycle (works with 1 item too)
  useEffect(() => {
    if (items.length === 0) return;

    let cancelled = false;

    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function scheduleHide() {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setShowing(false);
        scheduleNext();
      }, SHOW_MS);
    }

    function scheduleNext() {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setIndex((i) => (i + 1) % items.length);
        setShowing(true);
        scheduleHide();
      }, HIDE_MS);
    }

    // Start visible
    setShowing(true);
    scheduleHide();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [items]);

  if (items.length === 0) return null;

  const current = items[index % items.length];
  if (!current) return null;

  const name =
    current.isAnonymous || !current.donorName ? "Someone" : current.donorName;
  const title =
    current.projectTitle.length > 36
      ? current.projectTitle.slice(0, 34) + "…"
      : current.projectTitle;

  return (
    // Entire layer ignores pointer events so Fund / buttons stay tappable
    <div
      className="fixed inset-x-0 z-30 flex justify-center px-3 pointer-events-none"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative w-full max-w-sm sm:max-w-md">
        <AnimatePresence mode="wait">
          {showing && (
            <motion.div
              key={`${current.id}-${index}`}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <div className="mx-auto flex items-start gap-2 rounded-2xl bg-stone-900/95 text-white text-xs sm:text-sm px-3.5 py-2.5 shadow-lg border border-stone-700/80 backdrop-blur-sm max-w-full">
                <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <p className="leading-snug break-words min-w-0">
                  <strong className="font-medium">{name}</strong>
                  {" donated "}
                  <strong className="text-green-300">
                    {formatCurrency(current.amount, current.currency)}
                  </strong>
                  {" to "}
                  <span className="text-stone-300">{title}</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
