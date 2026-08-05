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

  async function sendEmail() {
    const res = await fetch("/api/developer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-email" }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed");
    else toast.success("Code sent to your email");
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
      load();
    }
  }

  async function sendPhone() {
    const res = await fetch("/api/developer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-phone", phone }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed");
    else toast.success("Code sent by SMS");
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
      toast.success("Security settings saved");
      setPassword("");
      setAnswer("");
      load();
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Account security</h1>
        <p className="text-sm text-stone-500 mt-1">
          Verify email & phone, set a password and security question for recovery. Required before
          withdrawals.
        </p>
      </div>

      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Email verification</h2>
        <p className="text-sm text-stone-600">
          {info?.email} —{" "}
          {info?.emailVerified ? (
            <span className="text-green-700 font-medium">Verified</span>
          ) : (
            <span className="text-amber-700 font-medium">Not verified</span>
          )}
        </p>
        {!info?.emailVerified && (
          <>
            <button type="button" onClick={sendEmail} className="text-sm underline">
              Send code to email
            </button>
            <div className="flex gap-2">
              <input
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="6-digit code"
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
        <h2 className="font-semibold">Phone verification</h2>
        {!info?.phoneVerified ? (
          <>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+265..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button type="button" onClick={sendPhone} className="text-sm underline">
              Send SMS code
            </button>
            <div className="flex gap-2">
              <input
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="6-digit code"
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
          <p className="text-sm text-green-700 font-medium">Phone verified: {info.phone}</p>
        )}
      </section>

      <form onSubmit={saveSecurity} className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Password & security question</h2>
        <p className="text-xs text-stone-500">
          Security question is used for account recovery / password reset.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={info?.hasPassword ? "New password (optional)" : "Set password (min 8)"}
          className="w-full border rounded-lg px-3 py-2 text-sm"
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
    </div>
  );
}
