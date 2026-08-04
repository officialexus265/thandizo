import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, calculateProgress } from "@/lib/utils";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DonationForm from "@/components/DonationForm";
import PaymentSuccessWatcher from "@/components/PaymentSuccessWatcher";
import { Suspense } from "react";
import PartnerButton from "@/components/PartnerButton";
import ShareButton from "@/components/ShareButton";
import { cache } from "react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const getProject = cache(async (slug: string) => {
  return prisma.project.findUnique({
    where: { slug },
    include: {
      updates: { where: { isPublic: true }, orderBy: { createdAt: "desc" }, take: 20 },
      media: { orderBy: { sortOrder: "asc" } },
      donations: {
        where: { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
});

async function getSettings() {
  return prisma.siteSettings.findUnique({ where: { id: "default" } });
}

async function getProjectPartners(projectId: string) {
  return prisma.partnerInterest.findMany({
    where: { projectId, isPublic: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) return {};

  const image = project.thumbnailUrl || project.media[0]?.url;

  return {
    title: project.title,
    description: project.shortDesc,
    openGraph: {
      title: project.title,
      description: project.shortDesc,
      type: "website",
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: project.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.shortDesc,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([getProject(slug), getSettings()]);

  if (!project) notFound()
  // Drafts are not public until admin publishes after the call
  if (project.status === "DRAFT" || project.status === "FLAGGED") {
    notFound()
  };

  const partners = await getProjectPartners(project.id);

  const progress = calculateProgress(Number(project.raisedAmount), Number(project.targetAmount));
  const isClosed = project.status === "CLOSED" || project.status === "FUNDED";

  return (
    <>
      <Suspense fallback={null}>
        <PaymentSuccessWatcher projectTitle={project.title} />
      </Suspense>
      <Header logoUrl={settings?.logoUrl} siteName={settings?.siteName || "thandizo"} />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        {/* Title & status */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900">{project.title}</h1>
            {project.developerName && (
              <p className="mt-1 text-sm text-stone-500">
                by <span className="font-medium text-stone-700">{project.developerName}</span>
              </p>
            )}
            {typeof project.workProgress === "number" && project.workProgress > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-stone-500 mb-1">
                  <span>Work progress</span>
                  <span>{project.workProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className="h-full bg-stone-800 rounded-full"
                    style={{ width: `${Math.min(100, project.workProgress)}%` }}
                  />
                </div>
                {project.progressNote && (
                  <p className="text-xs text-stone-500 mt-1">{project.progressNote}</p>
                )}
              </div>
            )}
            {project.status === "FUNDED" && (
              <span className="bg-green-700 text-white text-xs font-medium px-2 py-1 rounded">Funded</span>
            )}
            {project.status === "CLOSED" && (
              <span className="bg-stone-600 text-white text-xs font-medium px-2 py-1 rounded">Closed</span>
            )}
          </div>
          <p className="text-stone-500 text-sm">
            Created {new Date(project.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Thumbnail / first media */}
        {(project.thumbnailUrl || project.media[0]) && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-6 bg-stone-200">
            <Image
              src={project.thumbnailUrl || project.media[0].url}
              alt={project.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{formatCurrency(Number(project.raisedAmount), project.currency)} raised</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar mb-2">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap justify-between text-sm text-stone-600 gap-2">
            <span>Target: {formatCurrency(Number(project.targetAmount), project.currency)}</span>
            <span>{project.donorCount} donor{project.donorCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Sponsored by */}
        {partners.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-stone-600">
            <span className="font-medium">Sponsored by:</span>
            {partners.map((p) =>
              p.websiteUrl ? (
                <a
                  key={p.id}
                  href={p.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-red-700 transition"
                >
                  {p.logoUrl && (
                    <img src={p.logoUrl} alt={p.displayName || p.name} width={20} height={20} className="rounded-full object-cover" />
                  )}
                  {p.displayName || p.name}
                </a>
              ) : (
                <span key={p.id} className="inline-flex items-center gap-1.5">
                  {p.logoUrl && (
                    <img src={p.logoUrl} alt={p.displayName || p.name} width={20} height={20} className="rounded-full object-cover" />
                  )}
                  {p.displayName || p.name}
                </span>
              )
            )}
          </div>
        )}

        {/* Description */}
        <div className="prose prose-stone max-w-none mb-8">
          <h2 className="text-lg font-semibold mb-2">About this project</h2>
          <div className="whitespace-pre-wrap text-stone-700">{project.fullDesc}</div>
        </div>

        {/* Gallery link + Partner */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          {project.media.length > 0 && (
            <Link
              href={`/gallery/${project.slug}`}
              className="inline-flex items-center gap-2 text-red-700 font-medium hover:underline"
            >
              View full gallery ({project.media.length} items) →
            </Link>
          )}
          <PartnerButton
            projectId={project.id}
            projectTitle={project.title}
          />
          <ShareButton
            title={project.title}
            text={project.shortDesc}
            url={`/project/${project.slug}`}
          />
        </div>

        {/* Recent donations */}
        {project.donations.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Recent donations</h2>
            <ul className="space-y-2">
              {project.donations.map((d) => (
                <li key={d.id} className="flex justify-between text-sm bg-white border border-stone-100 rounded-lg px-3 py-2">
                  <span>
                    {d.isAnonymous || !d.donorName ? "Anonymous" : d.donorName}
                    {d.message && <span className="text-stone-500"> – “{d.message}”</span>}
                  </span>
                  <span className="font-medium text-green-700">
                    {formatCurrency(Number(d.amount), d.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/donations" className="text-sm text-red-700 hover:underline mt-2 inline-block">
              See all donations →
            </Link>
          </div>
        )}

        
        {/* Campaign updates */}
        {project.updates && project.updates.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Campaign updates</h2>
            <ul className="space-y-4">
              {project.updates.map((u: any) => (
                <li key={u.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <p className="font-semibold text-stone-900">{u.title}</p>
                  <p className="text-stone-700 whitespace-pre-wrap mt-2 text-sm leading-relaxed">
                    {u.body}
                  </p>
                  <p className="text-xs text-stone-400 mt-2">
                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Fund form */}
        {!isClosed && (
          <section id="fund" className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Fund this project</h2>
            <DonationForm
              projectId={project.id}
              projectTitle={project.title}
              projectSlug={project.slug}
              currency={project.currency}
            />
          </section>
        )}
      </main>
    </>
  );
}
