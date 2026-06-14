import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

// Node < 22 has no global WebSocket. The Neon serverless driver needs one when
// running under the Node.js runtime (Vercel's edge + Node 22+ provide it).
if (typeof globalThis.WebSocket === "undefined") {
  const ws = require("ws");
  neonConfig.webSocketConstructor = ws;
}

declare global {
  var __prisma: PrismaClient | undefined;
}

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });
}

// Lazy proxy: only instantiates the client on first property access.
// Lets `next build` import this module without DATABASE_URL set.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!global.__prisma) {
      global.__prisma = makeClient();
    }
    return Reflect.get(global.__prisma, prop, global.__prisma);
  },
});
