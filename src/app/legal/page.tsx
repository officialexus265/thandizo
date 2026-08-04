import Header from "@/components/Header";
import { DEFAULT_DONOR_DISCLAIMER } from "@/lib/legal";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LegalPage() {
  let disclaimer = DEFAULT_DONOR_DISCLAIMER;
  let siteName = "thandizo";
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (s?.donorDisclaimer) disclaimer = s.donorDisclaimer;
    if (s?.siteName) siteName = s.siteName;
  } catch {
    /* ignore */
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10 text-stone-800">
        <h1 className="text-2xl font-bold">Trust, liability &amp; KYC</h1>
        <p className="mt-2 text-sm text-stone-500">
          Please read before donating or fundraising on {siteName}.
        </p>

        <section className="mt-8 space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">For donors</h2>
          <div className="whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-4 text-stone-800">
            {disclaimer}
          </div>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">Platform role</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              {siteName} provides software and payment rails. Campaign owners manage and withdraw
              funds according to platform rules and fees.
            </li>
            <li>
              Admin approval means a human review was completed for the campaign type / size that
              requires it. It is <strong>not</strong> a guarantee of honesty or outcome.
            </li>
            <li>
              Administrators are not personally accountable for how approved fundraisers spend
              withdrawn funds.
            </li>
            <li>
              Where fraud is alleged, {siteName} may share fundraiser KYC and account details with
              law enforcement as required by law.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">KYC for fundraisers</h2>
          <p>Every fundraiser must complete identity verification before a campaign can be published:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>National ID document upload</li>
            <li>Selfie holding the same national ID</li>
            <li>
              Short video reading a verification script in English or Chichewa
            </li>
          </ul>
          <p className="text-stone-600">
            Medical campaigns, large appeals, and large targets always require additional human
            review after KYC.
          </p>
        </section>

        <p className="mt-10 text-sm">
          <Link href="/" className="text-red-700 hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </>
  );
}
