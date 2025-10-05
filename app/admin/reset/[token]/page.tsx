"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPerformPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset/perform", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Reset failed");
      } else {
        setOk(true);
  setTimeout(() => router.push("/private/admin/login"), 1800);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">Set New Password</h1>
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {ok ? (
          <div className="text-sm text-emerald-600">
            Password updated. Redirecting…
          </div>
        ) : null}
        <button
          disabled={loading}
          className="w-full rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
