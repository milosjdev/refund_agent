import { prisma } from "@/lib/db";
import { getRefundPolicy } from "@/lib/policy";

export type ToolName =
  | "lookup_customer"
  | "get_orders"
  | "get_order_items"
  | "get_existing_refunds"
  | "get_policy"
  | "process_refund"
  | "escalate_to_human";

export const TOOL_SCHEMAS = [
  {
    type: "function" as const,
    function: {
      name: "lookup_customer",
      description:
        "Find a customer by email (case-insensitive). Returns the customer record or null. Call this first to verify identity.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Customer email address" },
        },
        required: ["email"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_orders",
      description: "List all orders for a customer id.",
      parameters: {
        type: "object",
        properties: { customer_id: { type: "string" } },
        required: ["customer_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_order_items",
      description:
        "List items on an order, including price (priceCents), category, finalSale flag, digitalAccessed flag.",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string" } },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_existing_refunds",
      description:
        "Refunds the customer has on file (any status). Use to enforce duplicate-refund and serial-returner rules.",
      parameters: {
        type: "object",
        properties: { customer_id: { type: "string" } },
        required: ["customer_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_policy",
      description: "Return the full refund policy markdown text.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "process_refund",
      description:
        "Issue a refund. Only call after all checks pass and amount is $500.00 or less. amount_cents is the sum of refunded items' priceCents.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          item_ids: { type: "array", items: { type: "string" } },
          amount_cents: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["order_id", "item_ids", "amount_cents", "reason"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "escalate_to_human",
      description:
        "Hand off to a human agent. Use for: amount_over_limit, fraud_or_abuse_review, flagged_account, ambiguous_or_off_policy.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: [
              "amount_over_limit",
              "fraud_or_abuse_review",
              "flagged_account",
              "ambiguous_or_off_policy",
            ],
          },
          summary: {
            type: "string",
            description: "1-2 sentence summary for the human reviewer.",
          },
        },
        required: ["reason", "summary"],
        additionalProperties: false,
      },
    },
  },
];

type ToolResult = unknown;

export async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "lookup_customer": {
      const email = String(args.email ?? "").trim();
      if (!email) return { error: "email is required" };
      // case-insensitive match
      const row = await prisma.customer.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      return row ?? null;
    }
    case "get_orders": {
      const customerId = String(args.customer_id ?? "");
      return prisma.order.findMany({
        where: { customerId },
        orderBy: { placedAt: "desc" },
      });
    }
    case "get_order_items": {
      const orderId = String(args.order_id ?? "");
      return prisma.orderItem.findMany({ where: { orderId } });
    }
    case "get_existing_refunds": {
      const customerId = String(args.customer_id ?? "");
      return prisma.refund.findMany({
        where: { order: { customerId } },
        orderBy: { createdAt: "desc" },
      });
    }
    case "get_policy": {
      return { policy_markdown: getRefundPolicy() };
    }
    case "process_refund": {
      const orderId = String(args.order_id ?? "");
      const itemIds = Array.isArray(args.item_ids) ? (args.item_ids as string[]) : [];
      const amountCents = Number(args.amount_cents ?? 0);
      const reason = String(args.reason ?? "");

      if (!orderId || itemIds.length === 0 || !Number.isFinite(amountCents) || amountCents <= 0) {
        return { error: "invalid arguments" };
      }
      // Hard backstop: never accept > $500.
      if (amountCents > 50000) {
        return {
          error:
            "Backend enforcement: amount exceeds $500 — refund not processed. Use escalate_to_human with reason=amount_over_limit.",
        };
      }
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId, id: { in: itemIds } },
        select: { id: true, finalSale: true },
      });
      if (orderItems.length !== itemIds.length) {
        return { error: "Some item_ids do not belong to the order." };
      }
      if (orderItems.some((i) => i.finalSale)) {
        return { error: "Backend enforcement: one or more items are final_sale. Refund refused." };
      }

      const refund = await prisma.refund.create({
        data: {
          orderId,
          itemIdsJson: JSON.stringify(itemIds),
          amountCents,
          reason,
          status: "approved",
        },
      });
      return {
        refund_id: refund.id,
        status: refund.status,
        amount_cents: refund.amountCents,
      };
    }
    case "escalate_to_human": {
      // Recording-only — in prod this would page a queue.
      const ticketId = `ESC-${cryptoRandom().slice(0, 8).toUpperCase()}`;
      return {
        escalated: true,
        ticket_id: ticketId,
        reason: String(args.reason ?? ""),
      };
    }
    default:
      return { error: `unknown tool: ${name}` };
  }
}

function cryptoRandom(): string {
  // Avoid importing node:crypto at module top so this stays edge-friendly later if needed.
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
