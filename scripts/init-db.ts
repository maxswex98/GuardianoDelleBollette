import { ensureSchema } from "../src/lib/db/schema";

async function main() {
  await ensureSchema();
  console.log("Database schema initialized.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
