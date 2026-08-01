import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { expireStalePendingDonations } from "@/lib/donations";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDonationsPage() {
  await expireStalePendingDonations();

  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true, slug: true } },
    },
    take: 200,
  });

  const successCount = donations.filter((d) => d.status === "SUCCESS").length;
  const totalRaised = donations
    .filter((d) => d.status === "SUCCESS")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Donations</h1>
          <p className="text-stone-500 text-sm mt-1">
            {successCount} successful · Total raised (all currencies): {totalRaised.toLocaleString()}
          </p>
        </div>
        <a
          href="/api/admin/donations/export"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition"
        >
          Export CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Donor</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    {d.isAnonymous || !d.donorName ? (
                      <span className="text-stone-400">Anonymous</span>
                    ) : (
                      d.donorName
                    )}
                    {d.message && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">“{d.message}”</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${d.projectId}`} className="text-red-700 hover:underline">
                      {d.project.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(Number(d.amount), d.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        d.status === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : d.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {d.preferredContact !== "NONE" && (
                      <>
                        {d.email && <div>{d.email}</div>}
                        {d.phone && <div>{d.phone}</div>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {donations.length === 0 && (
          <p className="text-center text-stone-500 py-12">No donations yet.</p>
        )}
      </div>
    </div>
  );
}
