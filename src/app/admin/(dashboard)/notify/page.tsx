"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ProjectOption {
  id: string;
  title: string;
}

export default function NotifyPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["EMAIL"]);
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withSms: 0 });
  const [sending, setSending] = useState(false);
  const [testChannel, setTestChannel] = useState<"email" | "sms">("email");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [failedLogs, setFailedLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/alerts")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.recentFailedLogs)) setFailedLogs(d.recentFailedLogs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data.map((p: any) => ({ id: p.id, title: p.title })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const url = projectId
      ? `/api/admin/notify?projectId=${projectId}`
      : "/api/admin/notify";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.total !== undefined) setStats(data);
      })
      .catch(() => {});
  }, [projectId]);

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }
    if (channels.length === 0) {
      toast.error("Select at least one channel");
      return;
    }

    if (!confirm(`Send this message to donors via ${channels.join(" + ")}?`)) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          channels,
          projectId: projectId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(`Sent to ${data.recipients} recipient(s). ${data.sent} messages delivered.`);
      setMessage("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  async function runTest() {
    if (!testTo.trim()) {
      toast.error(testChannel === "email" ? "Enter an email" : "Enter a phone number");
      return;
    }
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/admin/test-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: testChannel, to: testTo.trim() }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
      if (data.result?.success) toast.success("Test sent — check your inbox / phone");
      else toast.error(data.result?.error || data.error || "Test failed — see result below");
    } catch (e: any) {
      toast.error(e.message);
      setTestResult(e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Send Notification to Donors</h1>
      <p className="text-stone-500 text-sm mb-6">
        Message people who donated and chose to be contacted. Use {"{name}"} to personalize.
      </p>

      <form onSubmit={handleSend} className="space-y-5 bg-white rounded-xl border border-stone-200 p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Filter by project (optional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
          Potential recipients: <strong>{stats.total}</strong> donors with contact preference
          <br />
          Email available: {stats.withEmail} · SMS available: {stats.withSms}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Channels</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={channels.includes("EMAIL")}
                onChange={() => toggleChannel("EMAIL")}
              />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={channels.includes("SMS")}
                onChange={() => toggleChannel("SMS")}
              />
              SMS
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-2 focus:ring-red-600 outline-none"
            placeholder="Hello {name}, thank you for supporting our work. Here is an update..."
          />
          <p className="text-xs text-stone-500 mt-1">
            Tip: write {"{name}"} where you want the donor’s name to appear.
          </p>
        </div>

        <button
          type="submit"
          disabled={sending || channels.length === 0}
          className="px-5 py-2.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send notification"}
        </button>
      </form>

      <section className="mt-10 bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">Test email / SMS</h2>
        <p className="text-sm text-stone-500">
          Uses Gmail SMTP if SMTP_USER + SMTP_PASS are set on Vercel; otherwise Resend. SMS uses httpSMS (phone app must be online).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTestChannel("email")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              testChannel === "email" ? "bg-stone-900 text-white" : "bg-white"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setTestChannel("sms")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              testChannel === "sms" ? "bg-stone-900 text-white" : "bg-white"
            }`}
          >
            SMS
          </button>
        </div>
        <input
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder={testChannel === "email" ? "you@email.com" : "+26599..."}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runTest}
          disabled={testing}
          className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {testing ? "Sending…" : "Send test"}
        </button>
        {testResult && (
          <pre className="text-xs bg-stone-50 border rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {testResult}
          </pre>
        )}
      </section>

      {failedLogs.length > 0 && (
        <section className="mt-8 bg-white border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Recent failed / skipped messages</h2>
          <ul className="space-y-2 text-sm">
            {failedLogs.map((l) => (
              <li key={l.id} className="border rounded-lg px-3 py-2">
                <span className="font-medium uppercase text-xs text-stone-500">{l.type}</span>{" "}
                → {l.recipient}
                <p className="text-xs text-red-700 mt-0.5 break-all">{l.status}</p>
                <p className="text-xs text-stone-400">{new Date(l.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
