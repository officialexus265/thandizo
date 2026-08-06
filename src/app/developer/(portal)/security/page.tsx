"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DeveloperSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [newCode, setNewCode] = useState("");
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);

  function load() {
    fetch("/api/developer/verify")
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        if (d.phone) setPhone(d.phone);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function sendEmailCode() {
    const res = await fetch("/api/developer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-email" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      if (data.retryAfterSeconds) setEmailCooldown(data.retryAfterSeconds);
      return;
    }
    toast.success("Code sent to your email");
    setEmailCooldown(data.cooldownSeconds || 60);
  }

  async function confirmEmail() {
    const res = await fetch("/api/developer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm-email", code: emailCode }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed");
    else {
      toast.success("Email verified");
      setEmailCode("");
      load();
    }
  }

  async function sendPhoneCode() {
    const res = await fetch("/api/developer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-phone", phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      if (data.retryAfterSeconds) setPhoneCooldown(data.retryAfterSeconds);
      return;
    }
    toast.success("SMS code sent");
    setPhoneCooldown(data.cooldownSeconds || 60);
  }

  async function confirmPhone() {
    const res = await fetch("/api/developer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm-phone", phone, code: phoneCode }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed");
    else {
      toast.success("Phone verified");
      setPhoneCode("");
      load();
    }
  }

  async function saveSecurity(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/developer/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: password || undefined,
        securityQuestion: question || undefined,
        securityAnswer: answer || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed");
    else {
      toast.success("Saved — security alert sent if contacts are set");
      setPassword("");
      setAnswer("");
      load();
    }
  }

  async function regenerateCode() {
    const res = await fetch("/api/developer/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "regenerate-access-code",
        password: confirmPw || undefined,
        securityAnswer: answer || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed");
    else {
      setNewCode(data.accessCode || "");
      toast.success("New access code created");
      setConfirmPw("");
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account security</h1>
        <p className="text-sm text-stone-500 mt-1">
          Verify contacts, set recovery question, and manage your access code. Codes are limited:
          wait 60 seconds between sends, max 5 per hour.
        </p>
      </div>

      <section className="bg-white border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Email</h2>
          {info?.emailVerified ? (
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Verified
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
              Not verified
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600">{info?.email}</p>
        {!info?.emailVerified && (
          <>
            <button
              type="button"
              onClick={sendEmailCode}
              disabled={emailCooldown > 0}
              className="text-sm underline disabled:no-underline disabled:text-stone-400"
            >
              {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Send email code"}
            </button>
            <div className="flex gap-2">
              <input
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={confirmEmail}
                className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm"
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </section>

      <section className="bg-white border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Phone</h2>
          {info?.phoneVerified ? (
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Verified
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
              Not verified
            </span>
          )}
        </div>
        {!info?.phoneVerified ? (
          <>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+265…"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={sendPhoneCode}
              disabled={phoneCooldown > 0}
              className="text-sm underline disabled:no-underline disabled:text-stone-400"
            >
              {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : "Send SMS code"}
            </button>
            <div className="flex gap-2">
              <input
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={confirmPhone}
                className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm"
              >
                Confirm
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-600">{info.phone}</p>
        )}
      </section>

      <form onSubmit={saveSecurity} className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Password & recovery question</h2>
        <p className="text-xs text-stone-500">
          Used to reset password and regenerate the portal access code.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={info?.hasPassword ? "New password (optional)" : "Set password (min 8)"}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          minLength={8}
        />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={info?.securityQuestion || "Security question"}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm">
          Save
        </button>
      </form>

      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Regenerate access code</h2>
        <p className="text-xs text-stone-500">
          Confirm with password or the security answer above. A security alert is sent.
        </p>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Current password"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={regenerateCode}
          className="w-full py-2.5 rounded-lg border text-sm font-medium hover:bg-stone-50"
        >
          Generate new access code
        </button>
        {newCode && (
          <p className="font-mono text-center bg-stone-100 rounded-lg p-3 font-bold tracking-wider">
            {newCode}
          </p>
        )}
      </section>
    </div>
  );
}
