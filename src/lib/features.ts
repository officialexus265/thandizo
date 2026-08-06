import { prisma } from "./prisma";

export type FeatureFlags = {
  registrationsEnabled: boolean;
  submissionsEnabled: boolean;
  withdrawalsEnabled: boolean;
  captchaRequired: boolean;
  maintenanceMode: boolean;
};

const defaults: FeatureFlags = {
  registrationsEnabled: true,
  submissionsEnabled: true,
  withdrawalsEnabled: true,
  captchaRequired: false,
  maintenanceMode: false,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (!s) return defaults;
    return {
      registrationsEnabled: (s as any).registrationsEnabled ?? true,
      submissionsEnabled: (s as any).submissionsEnabled ?? true,
      withdrawalsEnabled: (s as any).withdrawalsEnabled ?? true,
      captchaRequired: (s as any).captchaRequired ?? false,
      maintenanceMode: (s as any).maintenanceMode ?? false,
    };
  } catch {
    return defaults;
  }
}
