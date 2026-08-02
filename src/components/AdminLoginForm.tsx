"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

interface Props {
  logoUrl?: string | null;
  siteName?: string;
}

export default function AdminLoginForm({ logoUrl, siteName = "thandizo" }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("admin-credentials", {
        email,
        password,
        token: needs2FA ? token : undefined,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === "2FA_REQUIRED" || res.error.includes("2FA")) {
          setNeeds2FA(true);
          toast.message("Enter your 2FA code");
        } else {
          toast.error("Invalid credentials");
        }
        setLoading(false);
        return;
      }

      if (res?.ok) {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      toast.error("Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={56}
              height={56}
              className="rounded-full object-cover mx-auto mb-3"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-red-700 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {siteName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-stone-900">{siteName} Admin</h1>
          <p className="text-sm text-stone-500 mt-1">Secure access only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
              autoComplete="current-password"
            />
          </div>

          {needs2FA && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                2FA Code (from authenticator app)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 tracking-widest text-center text-lg"
                placeholder="000000"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-60 transition"
          >
            {loading ? "Signing in..." : needs2FA ? "Verify & Sign in" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
