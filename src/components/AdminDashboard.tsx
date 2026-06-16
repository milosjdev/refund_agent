"use client";

import { useState } from "react";
import { ResetDatabaseButton } from "@/components/ResetDatabaseButton";
import { TraceViewer } from "@/components/TraceViewer";

export function AdminDashboard({ initialTraceId }: { initialTraceId?: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <ResetDatabaseButton onReset={() => setRefreshKey((k) => k + 1)} />
      <TraceViewer key={refreshKey} initialTraceId={initialTraceId} />
    </div>
  );
}
