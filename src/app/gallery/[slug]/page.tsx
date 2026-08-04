import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) notFound()
  if (project.status === "DRAFT" || project.status === "FLAGGED") notFound();

  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });

  return (
    <>
      <Header logoUrl={settings?.logoUrl} siteName={settings?.siteName || "thandizo"} />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/project/${slug}`} className="text-sm text-red-700 hover:underline">
            ← Back to {project.title}
          </Link>
          <h1 className="text-2xl font-bold mt-2">Gallery – {project.title}</h1>
        </div>

        {project.media.length === 0 ? (
          <p className="text-stone-500 py-12 text-center">No media yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.media.map((m) => (
              <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-stone-200">
                {m.type === "VIDEO" ? (
                  <video
                    src={m.url}
                    controls
                    className="w-full h-full object-cover"
                    poster={project.thumbnailUrl || undefined}
                  />
                ) : (
                  <Image
                    src={m.url}
                    alt={m.caption || project.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                )}
                {m.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                    {m.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
