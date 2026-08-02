"use client";

import { useState } from "react";
import PartnerForm from "./PartnerForm";

interface Props {
  projectId?: string;
  projectTitle?: string;
  variant?: "primary" | "secondary";
  className?: string;
}

export default function PartnerButton({
  projectId,
  projectTitle,
  variant = "secondary",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const btnClass =
    variant === "primary"
      ? "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition"
      : "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 text-stone-800 hover:bg-stone-50 transition";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${btnClass} ${className}`}>
        Become a Partner
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900">Become a Partner</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Interested in partnering with us? Fill in the form and we will get back to you.
            </p>
            <PartnerForm
              projectId={projectId}
              projectTitle={projectTitle}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
