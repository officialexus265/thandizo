import { prisma } from "./prisma";

/** Whether a campaign must get human review before publish */
export async function computeReviewRequired(opts: {
  categoryId?: string | null;
  targetAmount: number | string | { toString(): string };
}): Promise<boolean> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const threshold = settings?.largeTargetThreshold ?? 500000;
  const target = Number(opts.targetAmount?.toString?.() ?? opts.targetAmount);
  if (target >= Number(threshold)) return true;
  if (opts.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: opts.categoryId } });
    if (cat?.requiresReview) return true;
  }
  return false;
}
