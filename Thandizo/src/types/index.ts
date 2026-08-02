export type Currency = "MWK" | "USD" | "GBP" | "EUR";

export type ProjectStatus = "ACTIVE" | "FUNDED" | "CLOSED";

export type ContactPreference = "NONE" | "EMAIL" | "SMS" | "BOTH";

export type DonationStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type MediaType = "IMAGE" | "VIDEO";

export interface ProjectCardProps {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  donorCount: number;
  thumbnailUrl: string | null;
  status: ProjectStatus;
  isPinned: boolean;
}
