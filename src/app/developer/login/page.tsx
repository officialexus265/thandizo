"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function DeveloperLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [useCode, setUseCode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("developer-credentials", {
        email,
        password: useCode ? "" : password,
        accessCode: useCode ? accessCode : "",
        redirect: false,
      });
      if (res?.error) {
        if (res.error.includes("TOO_MANY")) {
          toast.error("Too many attempts. Wait 15 minutes.");
        } else {
          toast.error("Invalid email or credentials");
        }
        setLoading(false);
        return;
      }
      if (res?.ok) {
        router.push("/developer");
        router.refresh();
      }
    } catch {
      toast.error("Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900">Fundraiser sign in</h1>
        <p className="text-sm text-stone-500 mt-1">
          Use the password you set at sign-up. Access code is a backup only.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>

          {!useCode ? (
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                autoComplete="current-password"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Access code</label>
              <input
                required
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-wider"
                autoComplete="one-time-code"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setUseCode((v) => !v)}
            className="text-xs text-stone-500 underline"
          >
            {useCode ? "Sign in with password instead" : "Sign in with access code instead"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-xs text-center text-stone-500 space-y-2">
          <p>
            No account?{" "}
            <Link href="/developer/register" className="underline font-medium text-stone-800">
              Create account
            </Link>
          </p>
          <p>
            <Link href="/developer/reset-password" className="underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
