import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    projectCount,
    activeCount,
    donationStats,
    recentDonations,
    activeProjects,
    partnerCount,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.donation.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { project: { select: { title: true } } },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.partnerInterest.count({ where: { status: "NEW" } }),
  ]);

  // Group raised by currency for better display
  const byCurrency = await prisma.donation.groupBy({
    by: ["currency"],
    where: { status: "SUCCESS" },
    _sum: { amount: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500">Projects</p>
          <p className="text-3xl font-bold mt-1">{projectCount}</p>
          <p className="text-xs text-stone-400 mt-1">{activeCount} active</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500">Successful donations</p>
          <p className="text-3xl font-bold mt-1">{donationStats._count}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500">Total raised</p>
          <div className="mt-1 space-y-0.5">
            {byCurrency.length === 0 ? (
              <p className="text-3xl font-bold">0</p>
            ) : (
              byCurrency.map((c) => (
                <p key={c.currency} className="text-lg font-bold text-green-700">
                  {formatCurrency(Number(c._sum.amount || 0), c.currency)}
                </p>
              ))
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500">New partner interests</p>
          <p className="text-3xl font-bold mt-1">{partnerCount}</p>
          <Link href="/admin/partners" className="text-xs text-red-700 hover:underline mt-1 inline-block">
            View all →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent donations</h2>
            <Link href="/admin/donations" className="text-sm text-red-700 hover:underline">
              View all
            </Link>
          </div>
          {recentDonations.length === 0 ? (
            <p className="text-stone-500 text-sm">No donations yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentDonations.map((d) => (
                <li key={d.id} className="flex justify-between text-sm">
                  <span>
                    {d.isAnonymous || !d.donorName ? "Anonymous" : d.donorName}
                    <span className="text-stone-400"> → {d.project.title}</span>
                  </span>
                  <span className="font-medium text-green-700">
                    {formatCurrency(Number(d.amount), d.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Active projects</h2>
            <Link href="/admin/projects" className="text-sm text-red-700 hover:underline">
              Manage
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <p className="text-stone-500 text-sm">No active projects.</p>
          ) : (
            <ul className="space-y-3">
              {activeProjects.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <Link href={`/admin/projects/${p.id}`} className="hover:text-red-700">
                    {p.title}
                  </Link>
                  <span className="text-stone-500">
                    {formatCurrency(Number(p.raisedAmount), p.currency)} / {formatCurrency(Number(p.targetAmount), p.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 transition"
        >
          + Create new project
        </Link>
        <Link
          href="/admin/notify"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-stone-300 text-stone-800 font-medium hover:bg-stone-50 transition"
        >
          Notify donors
        </Link>
      </div>
    </div>
  );
}
