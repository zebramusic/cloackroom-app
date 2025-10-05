"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [type, setType] = useState<"staff" | "admin">("staff");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember, type }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Login failed");
        return;
      }
  router.push("/private/handover");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">Login</h1>
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-3"
        aria-describedby={error ? "form-error" : undefined}
        noValidate
      >
        <fieldset>
          <legend className="block text-sm font-medium mb-1">Login as</legend>
          <div
            className="flex gap-4 text-sm"
            role="radiogroup"
            aria-label="Login type"
          >
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="login-type"
                value="staff"
                checked={type === "staff"}
                onChange={() => setType("staff")}
              />
              Staff
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="login-type"
                value="admin"
                checked={type === "admin"}
                onChange={() => setType("admin")}
              />
              Admin
            </label>
          </div>
        </fieldset>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            required
            autoComplete="email"
            aria-invalid={!!error}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-14"
              autoComplete="current-password"
              required
              aria-invalid={!!error}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-foreground/70 hover:text-foreground focus:outline-none"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />{" "}
          Remember me (two weeks)
        </label>
        {error ? (
          <div id="form-error" className="text-sm text-red-600" role="alert">
            {error}
          </div>
        ) : null}
        <button
          disabled={loading}
          className="w-full rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <div className="flex items-center justify-between text-sm">
          <Link
            href="/admin/reset/request"
            className="underline underline-offset-2"
          >
            Forgot password?
          </Link>
          <Link href="/admin/staff" className="underline underline-offset-2">
            Manage staff
          </Link>
        </div>
      </form>
    </main>
  );
}
