import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectMoneySummary } from "@/lib/developer";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DeveloperDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    redirect("/developer/login");
  }
  const developerId = (session.user as any).id as string;

  const developer = await prisma.developer.findUnique({ where: { id: developerId } });
  if (!developer) redirect("/developer/login");
  if (developer.bannedAt) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        This account is banned. Contact support if you believe this is a mistake.
      </div>
    );
  }

  const projects = await prisma.project.findMany({
    where: { developerId },
    orderBy: { updatedAt: "desc" },
  });

  const summaries = await Promise.all(
    projects.map(async (p) => ({
      project: p,
      money: await projectMoneySummary(p.id),
    }))
  );

  const totalAvailable = summaries.reduce((s, x) => s + x.money.available, 0);
  const totalRaised = summaries.reduce((s, x) => s + x.money.collected, 0);

  const steps = [
    {
      done: !!developer.emailVerifiedAt,
      label: "Verify email",
      href: "/developer/security",
    },
    {
      done: !!developer.phoneVerifiedAt,
      label: "Verify phone",
      href: "/developer/security",
    },
    {
      done: !!developer.securityQuestion,
      label: "Security question",
      href: "/developer/security",
    },
    {
      done: developer.kycStatus === "APPROVED",
      label:
        developer.kycStatus === "PENDING"
          ? "KYC under review"
          : developer.kycStatus === "REJECTED"
            ? "Resubmit KYC"
            : "Complete KYC",
      href: "/developer/kyc",
    },
    {
      done: projects.length > 0,
      label: "Submit a campaign",
      href: "/submit",
    },
  ];
  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {developer.name}</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage verification, campaigns, and withdrawals in one place.
        </p>
      </div>

      {nextStep && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-950">Next step</p>
            <p className="text-sm text-amber-900 mt-0.5">{nextStep.label}</p>
          </div>
          <Link
            href={nextStep.href}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium"
          >
            Continue
          </Link>
        </div>
      )}

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-3">Account checklist</h2>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-sm">
              <span className={s.done ? "text-green-800" : "text-stone-700"}>
                {s.done ? "✓" : "○"} {s.label}
              </span>
              {!s.done && (
                <Link href={s.href} className="text-xs underline text-stone-500">
                  Open
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-stone-500">Raised (all projects)</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(totalRaised, "MWK")}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-stone-500">Available to withdraw</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(totalAvailable, "MWK")}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-stone-500">Projects</p>
          <p className="text-lg font-bold mt-1">{projects.length}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/submit" className="px-3 py-1.5 rounded-lg bg-red-800 text-white font-medium">
          Submit project
        </Link>
        <Link href="/developer/withdrawals" className="px-3 py-1.5 rounded-lg border font-medium">
          Withdraw
        </Link>
        <Link href="/developer/ledger" className="px-3 py-1.5 rounded-lg border font-medium">
          Ledger
        </Link>
        <Link href="/developer/notifications" className="px-3 py-1.5 rounded-lg border font-medium">
          Inbox
        </Link>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Your projects</h2>
        {summaries.length === 0 ? (
          <p className="text-stone-500 text-sm">
            No projects yet. Complete KYC, then{" "}
            <Link href="/submit" className="underline">
              submit a campaign
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {summaries.map(({ project: p, money }) => (
              <li
                key={p.id}
                className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {p.status} · Raised {formatCurrency(money.collected, money.currency)} · Available{" "}
                    {formatCurrency(money.available, money.currency)}
                  </p>
                </div>
                <Link
                  href={`/developer/projects/${p.id}`}
                  className="text-sm px-3 py-1.5 rounded-lg border self-center"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
