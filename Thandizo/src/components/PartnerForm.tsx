"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  projectId?: string;
  projectTitle?: string;
  onClose?: () => void;
}

export default function PartnerForm({ projectId, projectTitle, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.email && !form.phone) {
      toast.error("Please provide email or phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          projectId: projectId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success("Thank you! We will contact you soon.");
      setForm({ name: "", email: "", phone: "", message: "" });
      onClose?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {projectTitle && (
        <p className="text-sm text-stone-600">
          Interested in partnering on: <strong>{projectTitle}</strong>
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Your name *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          placeholder="Full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          placeholder="+265..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Message (optional)</label>
        <textarea
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          placeholder="Tell us how you would like to partner..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-60 transition"
      >
        {loading ? "Submitting..." : "Submit Partnership Interest"}
      </button>
    </form>
  );
}
