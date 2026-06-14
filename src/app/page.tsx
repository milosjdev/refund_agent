import { ChatWindow } from "@/components/ChatWindow";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Customer chat</h1>
        <p className="text-sm text-[var(--muted)]">
          Ask for a refund. The agent verifies you by email, looks up your
          orders, and applies the refund policy.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
