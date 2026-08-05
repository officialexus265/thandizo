"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function DeveloperLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("developer-credentials", {
        email,
        accessCode,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Invalid email or access code");
        return;
      }
      toast.success("Welcome");
      router.push("/developer");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900">Developer portal</h1>
        <p className="text-sm text-stone-500 mt-1">
          Use the email and access code from your approval email.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Access code</label>
            <input
              type="text"
              required
              autoComplete="one-time-code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm tracking-widest font-mono focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-center text-stone-500 mt-4 space-x-3">
          <a href="/developer/register" className="underline">Create account</a>
          <a href="/developer/reset-password" className="underline">Reset password</a>
        </p>
        <p className="mt-4 text-center text-xs text-stone-400">
          <Link href="/" className="hover:text-red-700">
            Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
