import Header from "./Header";
import { prisma } from "@/lib/prisma";

export default async function SiteHeader() {
  let logoUrl: string | null = null;
  let siteName = "thandizo";
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    logoUrl = settings?.logoUrl ?? null;
    siteName = settings?.siteName || "thandizo";
  } catch {
    /* ignore */
  }
  return <Header logoUrl={logoUrl} siteName={siteName} />;
}
