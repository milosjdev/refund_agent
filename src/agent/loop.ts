import OpenAI from "openai";
import type { ChatTrace } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildSystemPrompt } from "./system-prompt";
import { TOOL_SCHEMAS, runTool } from "./tools";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_STEPS = 8;
const MAX_RETRIES_PER_CALL = 2;

// Per-1M-token pricing (USD). gpt-4o-mini defaults; override with env if needed.
const PRICE_INPUT_PER_M = Number(process.env.PRICE_INPUT_PER_M ?? 0.15);
const PRICE_OUTPUT_PER_M = Number(process.env.PRICE_OUTPUT_PER_M ?? 0.6);

export type AgentStep =
  | {
      type: "model_call";
      attempt: number;
      latency_ms: number;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;
      finish_reason: string;
      tool_calls?: Array<{ id: string; name: string; arguments: unknown }>;
      message?: string | null;
      error?: string;
    }
  | {
      type: "tool_call";
      name: string;
      arguments: unknown;
      latency_ms: number;
      result: unknown;
      error?: string;
    };

export type AgentResult = {
  traceId: string;
  assistantMessage: string;
  status: "completed" | "escalated" | "denied" | "error";
  steps: AgentStep[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  latencyMs: number;
};

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function classifyStatus(steps: AgentStep[], assistant: string): AgentResult["status"] {
  for (const s of steps) {
    if (s.type === "tool_call") {
      if (s.name === "escalate_to_human" && !s.error) return "escalated";
      if (s.name === "process_refund" && !s.error) {
        const r = s.result as { status?: string } | null;
        if (r?.status === "approved") return "completed";
      }
    }
  }
  if (/cannot|unable|denied|non-?refundable|outside the .* window/i.test(assistant)) {
    return "denied";
  }
  return "completed";
}

export async function runAgent(opts: {
  sessionId: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): Promise<AgentResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const startedAt = Date.now();

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...opts.history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    { role: "user", content: opts.userMessage },
  ];

  const steps: AgentStep[] = [];
  let totalIn = 0;
  let totalOut = 0;
  let totalCost = 0;
  let finalText = "";
  let status: AgentResult["status"] = "completed";

  outer: for (let step = 0; step < MAX_STEPS; step++) {
    let resp: OpenAI.Chat.Completions.ChatCompletion | null = null;
    let attempt = 0;
    let lastErr: unknown = null;

    while (attempt <= MAX_RETRIES_PER_CALL) {
      const callStart = Date.now();
      try {
        resp = await client.chat.completions.create({
          model: MODEL,
          messages,
          tools: TOOL_SCHEMAS,
          tool_choice: "auto",
          temperature: 0.2,
        });
        const inTok = resp.usage?.prompt_tokens ?? 0;
        const outTok = resp.usage?.completion_tokens ?? 0;
        const cost =
          (inTok * PRICE_INPUT_PER_M) / 1_000_000 + (outTok * PRICE_OUTPUT_PER_M) / 1_000_000;
        totalIn += inTok;
        totalOut += outTok;
        totalCost += cost;
        const choice = resp.choices[0];
        steps.push({
          type: "model_call",
          attempt,
          latency_ms: Date.now() - callStart,
          input_tokens: inTok,
          output_tokens: outTok,
          cost_usd: Number(cost.toFixed(6)),
          finish_reason: choice.finish_reason ?? "unknown",
          tool_calls: choice.message.tool_calls?.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: safeJson(tc.function.arguments),
          })),
          message: choice.message.content ?? null,
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        steps.push({
          type: "model_call",
          attempt,
          latency_ms: Date.now() - callStart,
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
          finish_reason: "error",
          error: err instanceof Error ? err.message : String(err),
        });
        attempt++;
      }
    }

    if (!resp) {
      status = "error";
      finalText = `Sorry — the agent failed after ${MAX_RETRIES_PER_CALL + 1} attempts: ${
        lastErr instanceof Error ? lastErr.message : String(lastErr)
      }`;
      break outer;
    }

    const choice = resp.choices[0];
    const msg = choice.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      finalText = msg.content ?? "";
      break outer;
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: msg.tool_calls,
    });

    for (const tc of msg.tool_calls) {
      const args = safeJson(tc.function.arguments) as Record<string, unknown>;
      const toolStart = Date.now();
      let result: unknown;
      let error: string | undefined;
      try {
        result = await runTool(tc.function.name, args ?? {});
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        result = { error };
      }
      steps.push({
        type: "tool_call",
        name: tc.function.name,
        arguments: args,
        latency_ms: Date.now() - toolStart,
        result,
        error,
      });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (!finalText && status !== "error") {
    finalText = "I'm sorry — I ran out of steps trying to resolve this. A human will follow up.";
    status = "escalated";
  } else if (status !== "error") {
    status = classifyStatus(steps, finalText);
  }

  const latencyMs = Date.now() - startedAt;

  // Determine next turn index for this session
  const existing = await prisma.chatTrace.findFirst({
    where: { sessionId: opts.sessionId },
    orderBy: { turnIndex: "desc" },
    select: { turnIndex: true },
  });
  const nextTurn = (existing?.turnIndex ?? -1) + 1;

  const trace = await prisma.chatTrace.create({
    data: {
      sessionId: opts.sessionId,
      turnIndex: nextTurn,
      userMessage: opts.userMessage,
      assistantMessage: finalText,
      status,
      stepsJson: JSON.stringify(steps),
      totalInputTokens: totalIn,
      totalOutputTokens: totalOut,
      totalCostUsd: Number(totalCost.toFixed(6)),
      latencyMs,
    },
  });

  return {
    traceId: trace.id,
    assistantMessage: finalText,
    status,
    steps,
    totalInputTokens: totalIn,
    totalOutputTokens: totalOut,
    totalCostUsd: Number(totalCost.toFixed(6)),
    latencyMs,
  };
}

function safeJson(s: string | null | undefined): unknown {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return { _raw: s };
  }
}

export async function listTraces(limit = 100): Promise<ChatTrace[]> {
  return prisma.chatTrace.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getTrace(id: string): Promise<ChatTrace | null> {
  return prisma.chatTrace.findUnique({ where: { id } });
}
