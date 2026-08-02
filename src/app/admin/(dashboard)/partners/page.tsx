import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PromotePartnerButton from "@/components/PromotePartnerButton";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const interests = await prisma.partnerInterest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true, slug: true } },
    },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Partner Interests</h1>
      <p className="text-stone-500 text-sm mb-6">
        People who clicked “Become a Partner” and submitted the form.
      </p>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Public listing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {interests.map((i) => (
              <tr key={i.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                  {new Date(i.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3 text-xs">
                  {i.email && <div>{i.email}</div>}
                  {i.phone && <div>{i.phone}</div>}
                </td>
                <td className="px-4 py-3">
                  {i.project ? (
                    <Link href={`/project/${i.project.slug}`} className="text-red-700 hover:underline">
                      {i.project.title}
                    </Link>
                  ) : (
                    <span className="text-stone-400">General</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-stone-600">
                  {i.message || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PromotePartnerButton
                    id={i.id}
                    submittedName={i.name}
                    isPublic={i.isPublic}
                    displayName={i.displayName}
                    logoUrl={i.logoUrl}
                    websiteUrl={i.websiteUrl}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {interests.length === 0 && (
          <p className="text-center text-stone-500 py-12">No partner interests yet.</p>
        )}
      </div>
    </div>
  );
}
