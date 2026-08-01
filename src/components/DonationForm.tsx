"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const [message, setMessage] = useState("");

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
          message: message || null,
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
        <label className="block text-sm font-medium text-stone-700 mb-1">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          placeholder="Leave a short note of support..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
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
