import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold text-lg">
              thandizo Admin
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm">
              <Link href="/admin" className="hover:text-red-300">Dashboard</Link>
              <Link href="/admin/projects" className="hover:text-red-300">Projects</Link>
              <Link href="/admin/donations" className="hover:text-red-300">Donations</Link>
              <Link href="/admin/settings" className="hover:text-red-300">Settings</Link>
              <Link href="/admin/security" className="hover:text-red-300">Security</Link>
              <Link href="/admin/partners" className="hover:text-red-300">Partners</Link>
              <Link href="/admin/notify" className="hover:text-red-300">Notify</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-400">{session.user?.email}</span>
            <Link href="/" className="hover:text-red-300">View site</Link>
            <Link href="/api/auth/signout" className="hover:text-red-300">Sign out</Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
