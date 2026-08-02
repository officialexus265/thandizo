import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  logoUrl?: string | null;
  siteName?: string;
}

export default function Header({ logoUrl, siteName = "thandizo" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-stone-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center font-bold text-lg shrink-0">
              M
            </div>
          )}
          <span className="text-lg sm:text-xl font-semibold tracking-tight truncate">
            {siteName}
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4 text-sm shrink-0">
          <Link href="/" className="hidden sm:inline hover:text-red-300 transition">
            Projects
          </Link>
          <Link href="/donations" className="hidden sm:inline hover:text-red-300 transition">
            Donations
          </Link>
          <Link
            href="/admin"
            className="px-2.5 py-1.5 sm:px-3 rounded-lg bg-red-700 hover:bg-red-800 transition font-medium text-xs sm:text-sm whitespace-nowrap"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
