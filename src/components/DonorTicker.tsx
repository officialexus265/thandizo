"use client";

import { useEffect, useState } from "react";
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

export default function DonorTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/donations/recent");
        if (!res.ok) return;
        const data: TickerItem[] = await res.json();
        if (!cancelled && data?.length) {
          setItems(data.slice(0, 15));
          setVisible(true);
        }
      } catch {
        /* ignore */
      }
    }

    load();
    const poll = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 4500);
    return () => clearInterval(t);
  }, [items.length]);

  if (!visible || items.length === 0) return null;

  const current = items[index % items.length];
  const name =
    current.isAnonymous || !current.donorName ? "Someone" : current.donorName;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 pointer-events-none flex justify-center px-4">
      <div className="relative w-full max-w-lg overflow-hidden h-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + "-" + index}
            initial={{ x: "110%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-110%", opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-stone-900/95 text-white text-sm px-4 py-2.5 shadow-lg border border-stone-700 backdrop-blur-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>
                <strong className="font-medium">{name}</strong>
                {" donated "}
                <strong className="text-green-300">
                  {formatCurrency(current.amount, current.currency)}
                </strong>
                {" to "}
                <span className="text-stone-300">{current.projectTitle}</span>
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
