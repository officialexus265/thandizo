"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getSessionId() {
  try {
    const key = "thandizo_sid";
    let id = localStorage.getItem(key);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Lightweight page-view tracker. Call trackAdView / trackAdClick later for ads. */
export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const last = useRef<string>("");

  useEffect(() => {
    // Don't track admin area (keeps stats focused on public traffic)
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    const qs = searchParams?.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    if (path === last.current) return;
    last.current = path;

    const payload = {
      type: "page_view",
      path,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      sessionId: getSessionId(),
    };

    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/track",
          new Blob([body], { type: "application/json" })
        );
      } else {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, [pathname, searchParams]);

  return null;
}

/** Use when you introduce ads */
export function trackAdView(label: string, meta?: Record<string, unknown>) {
  send("ad_view", label, meta);
}

export function trackAdClick(label: string, meta?: Record<string, unknown>) {
  send("ad_click", label, meta);
}

function send(type: string, label?: string, meta?: Record<string, unknown>) {
  const payload = {
    type,
    label,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    sessionId: getSessionId(),
    meta,
  };
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([body], { type: "application/json" })
      );
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
