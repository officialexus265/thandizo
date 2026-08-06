import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import AdminAlertsBar from "@/components/AdminAlertsBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }
  // Strict: only role admin (not merely "not developer")
  if ((session.user as any)?.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <AdminNav email={session.user?.email} />
      <AdminAlertsBar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
