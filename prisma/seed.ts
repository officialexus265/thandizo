import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "officialnexus265@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.admin.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.create({
      data: {
        email,
        passwordHash,
        name: "Thandizo Admin",
        twoFactorEnabled: false,
      },
    });
    console.log(`Admin created: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  // Ensure site settings exist
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteName: "thandizo",
      contactEmail: email,
    },
  });

  console.log("// Default fundraising categories
  const categories = [
    { name: "Medical", slug: "medical", feePercent: 6, requiresReview: true, sortOrder: 1 },
    { name: "Education", slug: "education", feePercent: 6, requiresReview: true, sortOrder: 2 },
    { name: "Church & community", slug: "church-community", feePercent: 5, requiresReview: false, sortOrder: 3 },
    { name: "Entertainment & creative", slug: "entertainment", feePercent: 10, requiresReview: false, sortOrder: 4 },
    { name: "Business & projects", slug: "business", feePercent: 10, requiresReview: false, sortOrder: 5 },
    { name: "Emergency / large appeal", slug: "emergency", feePercent: 7, requiresReview: true, sortOrder: 6 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { feePercent: c.feePercent, requiresReview: c.requiresReview, name: c.name },
      create: c,
    });
  }
  console.log("Categories seeded");

  console.log("Seed completed")");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
