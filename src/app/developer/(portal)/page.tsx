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

  return (
    <div>
      <h1 className="text-2xl font-bold">Your projects</h1>
      <p className="text-sm text-stone-500 mt-1 mb-6">
        Update progress, media, and details. Target amount changes need admin approval.
      </p>

      {summaries.length === 0 ? (
        <p className="text-stone-500 text-sm">No projects linked to your account yet.</p>
      ) : (
        <ul className="space-y-4">
          {summaries.map(({ project: p, money }) => (
            <li
              key={p.id}
              className="bg-white rounded-xl border border-stone-200 p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-lg">{p.title}</h2>
                  <p className="text-xs text-stone-500">{p.status}</p>
                </div>
                <Link
                  href={`/developer/projects/${p.id}`}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
                >
                  Manage
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Collected</p>
                  <p className="font-semibold">
                    {formatCurrency(money.collected, money.currency)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs text-amber-800">Held</p>
                  <p className="font-semibold text-amber-900">
                    {formatCurrency(money.held, money.currency)}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs text-green-800">Available</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(money.available, money.currency)}
                  </p>
                </div>
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Work progress</p>
                  <p className="font-semibold">{p.workProgress}%</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-red-700 rounded-full"
                  style={{ width: `${Math.min(100, p.workProgress)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
