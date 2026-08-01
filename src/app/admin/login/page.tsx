import { prisma } from "@/lib/prisma";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

async function getSettings() {
  return prisma.siteSettings.findUnique({ where: { id: "default" } });
}

export default async function AdminLoginPage() {
  const settings = await getSettings();

  return (
    <AdminLoginForm
      logoUrl={settings?.logoUrl}
      siteName={settings?.siteName || "thandizo"}
    />
  );
}
