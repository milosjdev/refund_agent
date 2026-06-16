import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { resetDatabase, SEED_CUSTOMERS } from "../src/lib/seed";
import { prisma } from "../src/lib/db";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

async function main() {
  const counts = await resetDatabase();
  console.log("Seed complete:", counts);
  console.log("\nEmails to try in the chat:");
  for (const c of SEED_CUSTOMERS) console.log(`  - ${c.email}  (${c.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
