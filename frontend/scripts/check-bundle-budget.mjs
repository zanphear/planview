// Bundle budget gate (forbidden-27: a CI bundle budget breach fails the build).
// Fails if any single emitted JS chunk exceeds PER_CHUNK_KB, or total JS exceeds
// TOTAL_KB. Tune the budgets down as the bundle is split further; never up silently.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ASSETS_DIR = new URL("../dist/assets", import.meta.url).pathname;
const PER_CHUNK_KB = 800; // largest acceptable single chunk (raw)
const TOTAL_KB = 1600; // largest acceptable total JS payload (raw)

let total = 0;
let worst = { name: "", kb: 0 };
const offenders = [];

for (const file of readdirSync(ASSETS_DIR)) {
  if (!file.endsWith(".js")) continue;
  const kb = statSync(join(ASSETS_DIR, file)).size / 1024;
  total += kb;
  if (kb > worst.kb) worst = { name: file, kb };
  if (kb > PER_CHUNK_KB) offenders.push(`${file}: ${kb.toFixed(0)} KB > ${PER_CHUNK_KB} KB`);
}

console.log(`Total JS: ${total.toFixed(0)} KB (budget ${TOTAL_KB} KB)`);
console.log(`Largest chunk: ${worst.name} ${worst.kb.toFixed(0)} KB (budget ${PER_CHUNK_KB} KB)`);

if (offenders.length || total > TOTAL_KB) {
  console.error("\nBundle budget exceeded:");
  offenders.forEach((o) => console.error("  " + o));
  if (total > TOTAL_KB) console.error(`  total ${total.toFixed(0)} KB > ${TOTAL_KB} KB`);
  console.error("\nSplit heavy deps via build.rollupOptions.manualChunks or lazy-load the route.");
  process.exit(1);
}
console.log("OK: within bundle budget.");
