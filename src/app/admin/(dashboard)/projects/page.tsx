import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import PublishProjectButton from "@/components/PublishProjectButton";
import ReviewCompleteButton from "@/components/ReviewCompleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ isPinned: "desc" }, { pinOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800"
        >
          + New project
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Raised / Target</th>
              <th className="px-4 py-3">Donors</th>
              <th className="px-4 py-3">Pinned</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-medium">{p.title}{p.developerName ? ` · ${p.developerName}` : ""}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : p.status === "FUNDED"
                        ? "bg-blue-100 text-blue-800"
                        : p.status === "DRAFT"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(Number(p.raisedAmount), p.currency)} / {formatCurrency(Number(p.targetAmount), p.currency)}
                </td>
                <td className="px-4 py-3">{p.donorCount}</td>
                <td className="px-4 py-3">{p.isPinned ? "Yes" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                  <ReviewCompleteButton
                    projectId={p.id}
                    reviewRequired={p.reviewRequired}
                    reviewCompleted={p.reviewCompleted}
                  />
                  <PublishProjectButton projectId={p.id} status={p.status} />
                  <Link href={`/admin/projects/${p.id}`} className="text-red-700 hover:underline text-xs">
                    Edit
                  </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <p className="text-center text-stone-500 py-12">No projects yet. Create one!</p>
        )}
      </div>
    </div>
  );
}
