"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: string;
        }
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

type Props = {
  onToken: (token: string | null) => void;
};

export default function Turnstile({ onToken }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => {
        const key = d.turnstileSiteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (key) {
          setSiteKey(key);
          setEnabled(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled || !siteKey || !ref.current) return;

    function render() {
      if (!ref.current || !window.turnstile || !siteKey) return;
      if (widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        theme: "light",
      });
    }

    if (window.turnstile) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => render();
    document.body.appendChild(script);
  }, [enabled, siteKey, onToken]);

  if (!enabled) return null;

  return (
    <div className="my-2">
      <div ref={ref} />
      <p className="text-[10px] text-stone-400 mt-1">Protected by Cloudflare Turnstile</p>
    </div>
  );
}
