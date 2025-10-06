import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HandoverClient from "../HandoverClient";

// Minimal mock for toast context to satisfy useToast
vi.mock("@/app/private/toast/ToastContext", () => ({
  useToast: () => ({ push: () => {} }),
}));

// Stub fetch used inside HandoverClient effect (list loading)
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({ ok: true, json: async () => [], status: 200 } as any))
);

describe("HandoverClient", () => {
  it("renders Photos heading", async () => {
    render(<HandoverClient />);
    expect(await screen.findByText(/Photos \(required 4\)/i)).toBeTruthy();
  });
});
