"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function DeveloperRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/developer";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    securityQuestion: "",
    securityAnswer: "",
  });
  const [accessCode, setAccessCode] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/developer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setAccessCode(data.accessCode || "");
      toast.success("Account created");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (accessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white border rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold">Account created</h1>
          <p className="text-sm text-stone-600">
            Save your access code (also sent by email/SMS):
          </p>
          <p className="font-mono text-lg font-bold tracking-wider bg-stone-100 rounded-lg p-3 text-center">
            {accessCode}
          </p>
          <ol className="text-sm text-stone-600 list-decimal pl-5 space-y-1">
            <li>Sign in with email + access code</li>
            <li>Verify email & phone (Security)</li>
            <li>Complete KYC (required before any campaign)</li>
            <li>After KYC approval, submit your project</li>
          </ol>
          <Link
            href={`/developer/login?next=${encodeURIComponent(nextPath)}`}
            className="block text-center py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full bg-white border rounded-2xl p-6 space-y-3"
      >
        <h1 className="text-xl font-bold">Fundraiser sign up</h1>
        <p className="text-sm text-stone-500">
          Create an account first. KYC is required before any campaign can go live.
        </p>
        {(
          [
            ["name", "Full name", "text"],
            ["email", "Email", "email"],
            ["phone", "Phone (+265…)", "tel"],
            ["password", "Password (min 8)", "password"],
            ["securityQuestion", "Security question (for recovery)", "text"],
            ["securityAnswer", "Security answer", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key}>
            <label className="text-sm font-medium">{label}</label>
            <input
              required
              type={type}
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-xs text-center text-stone-500">
          Already have an account?{" "}
          <Link href="/developer/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
