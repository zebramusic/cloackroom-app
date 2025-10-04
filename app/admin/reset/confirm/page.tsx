"use client";
import { useEffect, useState } from "react";

export default function ResetConfirmPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    setToken(usp.get("token") || "");
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setStatus(
      res.ok
        ? "Password updated. You can now log in."
        : "Failed. Token invalid or expired."
    );
  }
  return (
    <main className="mx-auto max-w-sm px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-3"
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
        <button className="w-full rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow">
          Update password
        </button>
        {status ? (
          <div className="text-sm text-muted-foreground">{status}</div>
        ) : null}
      </form>
    </main>
  );
}
