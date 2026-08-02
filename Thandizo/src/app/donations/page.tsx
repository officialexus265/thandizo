import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DonationsPage() {
  const [donations, settings] = await Promise.all([
    prisma.donation.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { title: true, slug: true } } },
      take: 100,
    }),
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
  ]);

  return (
    <>
      <Header logoUrl={settings?.logoUrl} siteName={settings?.siteName || "thandizo"} />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">All Donations</h1>
        <p className="text-stone-600 mb-6 text-sm">
          Full transparency. Every successful donation is listed here.
        </p>

        {donations.length === 0 ? (
          <p className="text-center text-stone-500 py-16">No donations yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Donor</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50">
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
                      <Link href={`/project/${d.project.slug}`} className="text-red-700 hover:underline">
                        {d.project.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {formatCurrency(Number(d.amount), d.currency)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {new Date(d.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
