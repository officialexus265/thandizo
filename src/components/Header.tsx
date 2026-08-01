import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  logoUrl?: string | null;
  siteName?: string;
}

export default function Header({ logoUrl, siteName = "thandizo" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-stone-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center font-bold text-lg">
              M
            </div>
          )}
          <span className="text-xl font-semibold tracking-tight">{siteName}</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-red-300 transition">
            Projects
          </Link>
          <Link href="/donations" className="hover:text-red-300 transition">
            Donations
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 transition font-medium"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}