"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");

  async function loadStatus() {
    try {
      const res = await fetch("/api/admin/2fa");
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(data.twoFactorEnabled);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function startSetup() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("setup");
      setToken("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function enable2FA(e: React.FormEvent) {
    e.preventDefault();
    if (!token || token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      toast.success("Two-factor authentication enabled!");
      setTwoFactorEnabled(true);
      setStep("idle");
      setQrCode(null);
      setSecret(null);
      setToken("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable2FA(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disable");
      toast.success("Two-factor authentication disabled");
      setTwoFactorEnabled(false);
      setStep("idle");
      setToken("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-stone-500">Loading...</div>;
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Security</h1>
      <p className="text-stone-500 text-sm mb-8">
        Protect your admin account with two-factor authentication (Google Authenticator, Authy, etc.)
      </p>

      {/* Current status */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm text-stone-500 mt-1">
              {twoFactorEnabled
                ? "Enabled – you will need a code from your authenticator app when logging in."
                : "Disabled – only email + password is required."}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              twoFactorEnabled
                ? "bg-green-100 text-green-800"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {twoFactorEnabled ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* Setup flow */}
      {!twoFactorEnabled && step === "idle" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-semibold mb-2">Enable 2FA</h3>
          <p className="text-sm text-stone-600 mb-4">
            You will scan a QR code with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).
          </p>
          <button
            onClick={startSetup}
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60"
          >
            {busy ? "Generating..." : "Start setup"}
          </button>
        </div>
      )}

      {step === "setup" && qrCode && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
          <h3 className="font-semibold">Scan this QR code</h3>
          <p className="text-sm text-stone-600">
            Open your authenticator app → Add account → Scan QR code
          </p>

          <div className="flex justify-center">
            <img src={qrCode} alt="2FA QR Code" className="w-52 h-52 border rounded-lg" />
          </div>

          {secret && (
            <div className="text-center">
              <p className="text-xs text-stone-500 mb-1">Or enter this code manually:</p>
              <code className="bg-stone-100 px-3 py-1 rounded text-sm font-mono tracking-wider">
                {secret}
              </code>
            </div>
          )}

          <form onSubmit={enable2FA} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-widest focus:ring-2 focus:ring-red-600 outline-none"
                placeholder="000000"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy || token.length !== 6}
                className="px-5 py-2.5 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-60"
              >
                {busy ? "Verifying..." : "Enable 2FA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setQrCode(null);
                  setSecret(null);
                  setToken("");
                }}
                className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disable flow */}
      {twoFactorEnabled && step === "idle" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-semibold mb-2">Disable 2FA</h3>
          <p className="text-sm text-stone-600 mb-4">
            You will need a current code from your authenticator app to disable it.
          </p>
          <button
            onClick={() => {
              setStep("disable");
              setToken("");
            }}
            className="px-5 py-2.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {step === "disable" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-semibold mb-4">Confirm disable</h3>
          <form onSubmit={disable2FA} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Enter current 6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-widest focus:ring-2 focus:ring-red-600 outline-none"
                placeholder="000000"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy || token.length !== 6}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? "Disabling..." : "Confirm Disable"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setToken("");
                }}
                className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
