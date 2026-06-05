import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const path = join(root, ".harness", "features", "features.json");

const id = process.argv[2];
const status = process.argv[3];

if (!id || !status) {
  console.error("Usage: node scripts/set-feature-status.mjs <feature-id> <status>");
  console.error("  <feature-id>: feat-001, feat-002, ...");
  console.error("  <status>: pending, approved, passing");
  process.exit(1);
}

const json = JSON.parse(readFileSync(path, "utf8"));
const feature = json.features.find((f) => f.id === id);

if (!feature) {
  console.error(`Feature ${id} not found`);
  process.exit(1);
}

feature.status = status;
writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
console.log(`  ${id}: ${feature.status} → ${status}`);
