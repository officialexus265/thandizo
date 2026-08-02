import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default async function DeveloperPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    redirect("/developer/login");
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-stone-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/developer" className="font-semibold">
              Developer portal
            </Link>
            <Link href="/developer" className="text-sm text-stone-300 hover:text-white">
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-400 truncate max-w-[140px]">
              {session.user?.name}
            </span>
            <Link href="/" className="hover:text-red-300">
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
