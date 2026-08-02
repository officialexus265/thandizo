"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  amount?: string;
  projectTitle?: string;
}

export default function DonationSuccessModal({ open, onClose, amount, projectTitle }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
              className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-3"
            >
              ✓
            </motion.div>
            <h3 className="text-xl font-bold text-stone-900">Thank you!</h3>
            <p className="mt-2 text-stone-600 text-sm leading-relaxed">
              {amount ? (
                <>
                  Your donation of <strong>{amount}</strong>
                  {projectTitle ? (
                    <>
                      {" "}
                      toward <strong>{projectTitle}</strong>
                    </>
                  ) : null}{" "}
                  was received.
                </>
              ) : (
                "Your donation was received."
              )}
            </p>
            <p className="mt-3 text-xs text-stone-400 italic">Inu ndi thandizo lathu</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
