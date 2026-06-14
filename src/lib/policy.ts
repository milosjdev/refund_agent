import fs from "node:fs";
import path from "node:path";

let _cached: string | null = null;

export function getRefundPolicy(): string {
  if (_cached) return _cached;
  const p = path.join(process.cwd(), "data", "refund-policy.md");
  _cached = fs.readFileSync(p, "utf8");
  return _cached;
}
