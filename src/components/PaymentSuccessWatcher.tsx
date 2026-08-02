"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DonationSuccessModal from "./DonationSuccessModal";

export default function PaymentSuccessWatcher({ projectTitle }: { projectTitle?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setOpen(true);
    }
  }, [searchParams]);

  function close() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("payment");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <DonationSuccessModal open={open} onClose={close} projectTitle={projectTitle} />
  );
}
