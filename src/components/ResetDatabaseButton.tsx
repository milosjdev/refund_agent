"use client";

import { useState } from "react";

type ResetResult = {
  customers: number;
  orders: number;
  items: number;
  refunds: number;
};

export function ResetDatabaseButton({ onReset }: { onReset?: () => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleReset() {
    const confirmed = window.confirm(
      "Reset the database?\n\nThis deletes all customers, orders, refunds, and chat traces, then reseeds the 15 demo customers.",
    );
    if (!confirmed) return;

    setPending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/reset-db", { method: "POST" });
      const data = (await res.json()) as ResetResult & { error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Reset failed" });
        return;
      }
      setMessage({
        type: "ok",
        text: `Database reset — ${data.customers} customers, ${data.orders} orders, ${data.items} items, ${data.refunds} refunds.`,
      });
      onReset?.();
    } catch (err) {
      setMessage({ type: "err", text: String(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleReset}
        disabled={pending}
        className="rounded border border-rose-500/50 bg-rose-950/30 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-950/50 disabled:opacity-50"
      >
        {pending ? "Resetting…" : "Reset database"}
      </button>
      {message ? (
        <span
          className={
            "text-xs " + (message.type === "ok" ? "text-emerald-300" : "text-rose-300")
          }
        >
          {message.text}
        </span>
      ) : null}
    </div>
  );
}
