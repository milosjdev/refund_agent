import { TraceViewer } from "@/components/TraceViewer";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ trace?: string }>;
}) {
  const { trace } = await searchParams;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin · Agent traces</h1>
        <p className="text-sm text-[var(--muted)]">
          Every chat turn. Tool I/O, retries, token cost, latency.
        </p>
      </div>
      <TraceViewer initialTraceId={trace ?? null} />
    </div>
  );
}
