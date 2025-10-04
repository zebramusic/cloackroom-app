"use client";
import { useState } from "react";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed");
      } else {
        setSent(j.token || "OK");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">Password Reset</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email. If it exists, a reset token will be generated.
      </p>
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {sent ? (
          <div className="text-xs rounded-md bg-muted p-2">
            Token generated (demo): <code className="break-all">{sent}</code>
          </div>
        ) : null}
        <button
          disabled={loading}
          className="w-full rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow"
        >
          {loading ? "Sending..." : "Request reset"}
        </button>
      </form>
    </main>
  );
}
