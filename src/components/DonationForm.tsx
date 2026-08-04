"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { DEFAULT_DONOR_DISCLAIMER } from "@/lib/legal";

interface Props {
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  currency: string;
}

const CURRENCIES = ["MWK", "USD", "GBP", "EUR"];

export default function DonationForm({ projectId, projectTitle, projectSlug, currency: defaultCurrency }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState<"NONE" | "EMAIL" | "SMS" | "BOTH">("NONE");
  const [fundMode, setFundMode] = useState<"HOLD" | "DIRECT">("HOLD");
  const [message, setMessage] = useState("");
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [feePercent, setFeePercent] = useState(0);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/project-fee?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.feePercent === "number") setFeePercent(d.feePercent);
        if (d.categoryName) setCategoryName(d.categoryName);
      })
      .catch(() => {});
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (preferredContact === "EMAIL" || preferredContact === "BOTH") {
      if (!email) {
        toast.error("Email is required for the selected communication preference");
        return;
      }
    }
    if (preferredContact === "SMS" || preferredContact === "BOTH") {
      if (!phone) {
        toast.error("Phone number is required for the selected communication preference");
        return;
      }
    }
    if (!acceptRisk) {
      toast.error("Please confirm you understand the donor risks before continuing");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/donations/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          amount: Number(amount),
          currency,
          donorName: isAnonymous ? null : donorName || null,
          isAnonymous,
          email: email || null,
          phone: phone || null,
          preferredContact,
          fundMode,
          message: message || null,
          acceptedRisk: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      // Redirect to PayChangu checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Amount *</label>
          <input
            type="number"
            min="1"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            placeholder="e.g. 5000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded border-stone-300"
          />
          Donate anonymously
        </label>
      </div>

      {!isAnonymous && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Your name</label>
          <input
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            placeholder="How should we call you?"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          How would you like to be contacted? (optional)
        </label>
        <select
          value={preferredContact}
          onChange={(e) => setPreferredContact(e.target.value as any)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="NONE">No communication needed</option>
          <option value="EMAIL">Email only</option>
          <option value="SMS">SMS (phone) only</option>
          <option value="BOTH">Both email and SMS</option>
        </select>
      </div>

      {(preferredContact === "EMAIL" || preferredContact === "BOTH") && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
          <input
            type="email"
            required={preferredContact === "EMAIL" || preferredContact === "BOTH"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            placeholder="you@example.com"
          />
        </div>
      )}

      {(preferredContact === "SMS" || preferredContact === "BOTH") && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Phone number *</label>
          <input
            type="tel"
            required={preferredContact === "SMS" || preferredContact === "BOTH"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            placeholder="+265..."
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">How should your donation be handled? *</label>
        <div className="space-y-2 mt-1">
          <label className="flex items-start gap-2 text-sm border border-stone-200 rounded-lg p-3 cursor-pointer hover:bg-stone-50">
            <input
              type="radio"
              name="fundMode"
              checked={fundMode === "HOLD"}
              onChange={() => setFundMode("HOLD")}
              className="mt-1"
            />
            <span>
              <strong>Hold until project is verified</strong>
              <span className="block text-stone-500 text-xs mt-0.5">
                Funds are held. If the project is flagged as not legitimate before it finishes, you can be refunded (minus 10% processing fee).
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm border border-stone-200 rounded-lg p-3 cursor-pointer hover:bg-stone-50">
            <input
              type="radio"
              name="fundMode"
              checked={fundMode === "DIRECT"}
              onChange={() => setFundMode("DIRECT")}
              className="mt-1"
            />
            <span>
              <strong>Release directly to the project</strong>
              <span className="block text-stone-500 text-xs mt-0.5">
                Funds go straight to the project. No refund is available later.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          placeholder="Leave a short note of support..."
        />
      </div>

      {Number(amount) > 0 && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 space-y-1">
          <p className="font-semibold text-stone-900">Donation breakdown</p>
          <p>You pay: <strong>{currency} {Number(amount).toLocaleString()}</strong></p>
          <p>
            Platform fee{categoryName ? ` (${categoryName})` : ""}:{" "}
            <strong>
              {feePercent}% ≈ {currency}{" "}
              {((Number(amount) * feePercent) / 100).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </strong>
          </p>
          <p>
            Toward campaign:{" "}
            <strong>
              {currency}{" "}
              {(
                Number(amount) -
                (Number(amount) * feePercent) / 100
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </strong>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-stone-800 space-y-2">
        <p className="font-semibold text-amber-950">Before you donate</p>
        <p className="leading-relaxed whitespace-pre-wrap line-clamp-6">{DEFAULT_DONOR_DISCLAIMER}</p>
        <p>
          <Link href="/legal" className="text-red-700 underline font-medium" target="_blank">
            Read full trust &amp; liability notice
          </Link>
        </p>
        <label className="flex items-start gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={acceptRisk}
            onChange={(e) => setAcceptRisk(e.target.checked)}
            className="mt-0.5 rounded border-stone-400"
            required
          />
          <span>
            I understand that admin approval does not eliminate fraud risk, that I should only
            fund campaigns I understand, and that Thandizo / admins are not liable for how a
            fundraiser uses withdrawn funds.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !acceptRisk}
        className="w-full py-3 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 disabled:opacity-60 transition"
      >
        {loading ? "Redirecting to payment..." : `Donate with PayChangu`}
      </button>

      <p className="text-xs text-stone-500 text-center">
        You will be redirected to PayChangu’s secure checkout.
      </p>
    </form>
  );
}
