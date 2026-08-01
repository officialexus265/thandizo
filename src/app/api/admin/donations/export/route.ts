import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true, slug: true } },
    },
  });

  // CSV header
  const headers = [
    "Date",
    "Donor Name",
    "Anonymous",
    "Amount",
    "Currency",
    "Project",
    "Status",
    "Email",
    "Phone",
    "Contact Preference",
    "Message",
    "Tx Ref",
  ];

  const rows = donations.map((d) => [
    new Date(d.createdAt).toISOString(),
    d.donorName || "",
    d.isAnonymous ? "Yes" : "No",
    Number(d.amount).toString(),
    d.currency,
    d.project.title,
    d.status,
    d.email || "",
    d.phone || "",
    d.preferredContact,
    (d.message || "").replace(/"/g, '""'),
    d.txRef,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="thandizo-donations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
