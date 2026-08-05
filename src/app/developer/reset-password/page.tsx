"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/developer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "start", email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (!data.securityQuestion) {
        toast.error("No security question on this account — contact admin");
        return;
      }
      setQuestion(data.securityQuestion);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/developer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "reset",
          email,
          securityAnswer: answer,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCode(data.accessCode || "");
      toast.success("Password reset");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (code) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
        <div className="max-w-md w-full bg-white border rounded-2xl p-6 space-y-3">
          <h1 className="text-xl font-bold">Password updated</h1>
          <p className="text-sm">New access code (also emailed/SMS):</p>
          <p className="font-mono font-bold text-center bg-stone-100 p-3 rounded-lg">{code}</p>
          <Link href="/developer/login" className="block text-center text-sm underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
      <div className="max-w-md w-full bg-white border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold">Reset password</h1>
        {!question ? (
          <form onSubmit={start} className="space-y-3">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Account email"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm"
            >
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-3">
            <p className="text-sm text-stone-600">
              Security question: <strong>{question}</strong>
            </p>
            <input
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8)"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm"
            >
              Reset password
            </button>
          </form>
        )}
        <Link href="/developer/login" className="text-xs text-stone-500 underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
