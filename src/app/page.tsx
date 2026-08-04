import DonorTicker from "@/components/DonorTicker";
import FadeIn from "@/components/FadeIn";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import PartnerButton from "@/components/PartnerButton";
import ShareButton from "@/components/ShareButton";

export const dynamic = "force-dynamic";

async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "FUNDED"] } },
      orderBy: [
        { isPinned: "desc" },
        { pinOrder: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        media: {
          where: { type: "IMAGE" },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });
    return projects;
  } catch (e) {
    console.error("Failed to fetch projects", e);
    return [];
  }
}

async function getSettings() {
  try {
    return await prisma.siteSettings.findUnique({ where: { id: "default" } });
  } catch {
    return null;
  }
}

async function getGeneralPartners() {
  try {
    return await prisma.partnerInterest.findMany({
      where: { projectId: null, isPublic: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [projects, settings, partners] = await Promise.all([
    getProjects(),
    getSettings(),
    getGeneralPartners(),
  ]);

  return (
    <>
      <Header logoUrl={settings?.logoUrl} siteName={settings?.siteName || "thandizo"} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-stone-900 text-white py-12 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Fund Projects That Matter
            </h1>
            <p className="mt-3 text-stone-300 max-w-2xl mx-auto">
              Transparent community funding. Every donation is tracked. Every project has a clear target.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <PartnerButton variant="primary" className="!bg-red-700 hover:!bg-red-800" />
              <ShareButton
                title={settings?.siteName || "thandizo"}
                text="Transparent community funding. Support projects that matter."
                url="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-500 text-white font-medium hover:bg-stone-800 transition"
              />
            </div>
          </div>
        </section>

        {/* Projects feed – horizontal on desktop (max 3), vertical on mobile */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          {projects.length === 0 ? (
            <div className="text-center py-20 text-stone-500">
              <p className="text-lg">No projects yet.</p>
              <p className="mt-2 text-sm">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p, i) => (
                <FadeIn key={p.id} delay={Math.min(i * 0.06, 0.24)}>
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  slug={p.slug}
                  developerName={p.developerName}
                  shortDesc={p.shortDesc}
                  targetAmount={Number(p.targetAmount)}
                  raisedAmount={Number(p.raisedAmount)}
                  currency={p.currency}
                  donorCount={p.donorCount}
                  thumbnailUrl={p.thumbnailUrl || p.media[0]?.url || null}
                  status={p.status}
                />
                </FadeIn>
              ))}
            </div>
          )}
        </section>
        {/* Our Partners */}
        {partners.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-10">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-stone-500 mb-4">
              Our Partners
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {partners.map((p) =>
                p.websiteUrl ? (
                  <a
                    key={p.id}
                    href={p.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-stone-700 hover:text-red-700 transition"
                  >
                    {p.logoUrl && (
                      <img src={p.logoUrl} alt={p.displayName || p.name} width={32} height={32} className="rounded-full object-cover" />
                    )}
                    <span className="font-medium">{p.displayName || p.name}</span>
                  </a>
                ) : (
                  <span key={p.id} className="flex items-center gap-2 text-stone-700">
                    {p.logoUrl && (
                      <img src={p.logoUrl} alt={p.displayName || p.name} width={32} height={32} className="rounded-full object-cover" />
                    )}
                    <span className="font-medium">{p.displayName || p.name}</span>
                  </span>
                )
              )}
            </div>
          </section>
        )}
      </main>

      <footer
        className="bg-stone-900 text-stone-400 pt-8 px-4 text-center text-sm"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
      >
        <p>
          © {new Date().getFullYear()} {settings?.siteName || "thandizo"}. All rights reserved.
        </p>
        <p className="mt-1">Inu ndi thandizo lathu</p>
        <p className="mt-2">
          <Link href="/legal" className="hover:text-white transition">
            Trust & liability
          </Link>
        </p>
        <p className="mt-2">
          <Link href="/admin" className="hover:text-white transition">
            Admin
          </Link>
        </p>
      </footer>
      <DonorTicker />
    </>
  );
}
