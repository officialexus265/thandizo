"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

/** Public entry: send fundraisers to the simplified portal flow */
export default function SubmitRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && (session?.user as any)?.role === "developer") {
      router.replace("/developer/submit");
    } else if (status === "unauthenticated") {
      router.replace("/developer/register?next=/developer/submit");
    }
  }, [status, session, router]);

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-16 text-center text-sm text-stone-600">
        <p>Redirecting to fundraiser flow…</p>
        <p className="mt-4">
          <Link href="/developer/register" className="underline">
            Create account
          </Link>
          {" · "}
          <Link href="/developer/login" className="underline">
            Sign in
          </Link>
        </p>
      </main>
    </>
  );
}
