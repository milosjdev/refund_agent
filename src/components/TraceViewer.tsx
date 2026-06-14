"use client";

import { useEffect, useState } from "react";
import type { AgentStep } from "@/agent/loop";

type TraceRow = {
  id: string;
  sessionId: string;
  turnIndex: number;
  userMessage: string;
  assistantMessage: string | null;
  status: string;
  stepsJson: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  latencyMs: number;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-emerald-500/20 text-emerald-300"
      : status === "escalated"
      ? "bg-amber-500/20 text-amber-300"
      : status === "denied"
      ? "bg-rose-500/20 text-rose-300"
      : "bg-zinc-500/20 text-zinc-300";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${color}`}>
      {status}
    </span>
  );
}

function StepRow({ step, i }: { step: AgentStep; i: number }) {
  if (step.type === "model_call") {
    return (
      <div className="rounded border border-[var(--border)] bg-black/30 p-3">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            <span className="font-mono text-[var(--fg)]">#{i + 1}</span> · model call
            {step.attempt > 0 ? (
              <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                retry #{step.attempt}
              </span>
            ) : null}
          </span>
          <span>
            {step.latency_ms}ms · in {step.input_tokens} / out {step.output_tokens} · $
            {step.cost_usd.toFixed(6)}
          </span>
        </div>
        {step.error ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-rose-950/40 p-2 text-[11px] text-rose-200">
            {step.error}
          </pre>
        ) : null}
        {step.message ? (
          <div className="rounded bg-black/40 p-2 text-xs whitespace-pre-wrap">
            <span className="text-[var(--muted)]">message:</span> {step.message}
          </div>
        ) : null}
        {step.tool_calls?.length ? (
          <div className="mt-2 space-y-1 text-xs">
            <div className="text-[var(--muted)]">tool calls requested:</div>
            {step.tool_calls.map((tc, j) => (
              <div key={j} className="rounded bg-black/40 p-2 font-mono text-[11px]">
                {tc.name}({JSON.stringify(tc.arguments)})
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
          finish: {step.finish_reason}
        </div>
      </div>
    );
  }
  // tool_call
  const err = step.error;
  return (
    <div className="rounded border border-[var(--border)] bg-black/30 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          <span className="font-mono text-[var(--fg)]">#{i + 1}</span> · tool ·{" "}
          <span className="font-mono text-[var(--accent)]">{step.name}</span>
        </span>
        <span>{step.latency_ms}ms</span>
      </div>
      <div className="grid gap-2 text-xs lg:grid-cols-2">
        <div>
          <div className="text-[var(--muted)]">args</div>
          <pre className="overflow-x-auto rounded bg-black/40 p-2 text-[11px]">
            {JSON.stringify(step.arguments, null, 2)}
          </pre>
        </div>
        <div>
          <div className="text-[var(--muted)]">result</div>
          <pre
            className={`overflow-x-auto rounded p-2 text-[11px] ${
              err ? "bg-rose-950/40 text-rose-200" : "bg-black/40"
            }`}
          >
            {JSON.stringify(step.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function TraceViewer({ initialTraceId }: { initialTraceId?: string | null }) {
  const [list, setList] = useState<TraceRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialTraceId ?? null);
  const [detail, setDetail] = useState<TraceRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/traces")
      .then((r) => r.json())
      .then((d) => {
        setList(d.traces ?? []);
        if (!selectedId && d.traces?.length) setSelectedId(d.traces[0].id);
      });
    // load list once on mount
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/traces?id=${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const steps: AgentStep[] = detail ? (JSON.parse(detail.stepsJson) as AgentStep[]) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-lg border border-[var(--border)] bg-[var(--bg-2)]">
        <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Recent traces
        </div>
        <ul className="max-h-[80vh] overflow-y-auto divide-y divide-[var(--border)]">
          {list.length === 0 ? (
            <li className="p-3 text-xs text-[var(--muted)]">No traces yet.</li>
          ) : (
            list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={
                    "w-full px-3 py-2 text-left text-xs hover:bg-black/30 " +
                    (t.id === selectedId ? "bg-black/40" : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono">{t.id.slice(0, 8)}…</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-1 truncate text-[var(--muted)]">
                    {t.userMessage}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {new Date(t.createdAt).toLocaleString()} · {t.latencyMs}ms · $
                    {t.totalCostUsd.toFixed(5)}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-2)] p-4">
        {!detail ? (
          <div className="text-sm text-[var(--muted)]">
            {loading ? "Loading…" : "Select a trace on the left."}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
              <StatusBadge status={detail.status} />
              <span className="text-[var(--muted)]">
                trace <code className="font-mono text-[var(--fg)]">{detail.id}</code>
              </span>
              <span className="text-[var(--muted)]">
                session <code className="font-mono">{detail.sessionId}</code> · turn{" "}
                {detail.turnIndex}
              </span>
              <span className="ml-auto text-[var(--muted)]">
                {detail.latencyMs}ms · in {detail.totalInputTokens} / out{" "}
                {detail.totalOutputTokens} tok · ${detail.totalCostUsd.toFixed(6)}
              </span>
            </div>

            <div className="mb-4 grid gap-2 lg:grid-cols-2">
              <div className="rounded border border-[var(--border)] bg-black/30 p-3 text-xs">
                <div className="mb-1 text-[var(--muted)]">User</div>
                <div className="whitespace-pre-wrap">{detail.userMessage}</div>
              </div>
              <div className="rounded border border-[var(--border)] bg-black/30 p-3 text-xs">
                <div className="mb-1 text-[var(--muted)]">Assistant</div>
                <div className="whitespace-pre-wrap">{detail.assistantMessage ?? "—"}</div>
              </div>
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Steps ({steps.length})
            </h3>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <StepRow key={i} step={s} i={i} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
