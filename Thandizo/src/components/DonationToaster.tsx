"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RecentDonation {
  id: string;
  donorName: string | null;
  isAnonymous: boolean;
  amount: number;
  currency: string;
  projectTitle: string;
  createdAt: string;
}

export default function DonationToaster() {
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  useEffect(() => {
    // Load last seen from sessionStorage so we don't re-show old ones on refresh
    const stored = sessionStorage.getItem("thandizo_last_donation_id");
    if (stored) setLastSeenId(stored);

    async function checkNewDonations() {
      try {
        const res = await fetch("/api/donations/recent");
        if (!res.ok) return;
        const donations: RecentDonation[] = await res.json();
        if (!donations.length) return;

        const newest = donations[0];

        // First load – just record the newest id, don't toast
        if (!lastSeenId) {
          setLastSeenId(newest.id);
          sessionStorage.setItem("thandizo_last_donation_id", newest.id);
          return;
        }

        // Find donations newer than lastSeenId
        const newOnes = [];
        for (const d of donations) {
          if (d.id === lastSeenId) break;
          newOnes.push(d);
        }

        // Show newest first (reverse so oldest of the new batch shows first)
        newOnes.reverse().forEach((d) => {
          const name = d.isAnonymous || !d.donorName ? "Someone" : d.donorName;
          const amount = `${d.currency} ${Number(d.amount).toLocaleString()}`;
          toast.success(`${name} donated ${amount} towards ${d.projectTitle}`, {
            duration: 6000,
          });
        });

        if (newOnes.length > 0) {
          setLastSeenId(newest.id);
          sessionStorage.setItem("thandizo_last_donation_id", newest.id);
        }
      } catch {
        // silent fail
      }
    }

    // Check immediately and then every 25 seconds
    checkNewDonations();
    const interval = setInterval(checkNewDonations, 25000);
    return () => clearInterval(interval);
  }, [lastSeenId]);

  return null; // this component only triggers toasts
}
