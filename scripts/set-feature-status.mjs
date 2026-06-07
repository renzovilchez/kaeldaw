import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const featuresPath = join(root, ".harness", "features", "features.json");

const id = process.argv[2];
const newStatus = process.argv[3];
const testPath = process.argv[4]; // opcional

const VALID_STATUSES = ["pending", "approved", "passing", "archive"];

if (!id || !newStatus) {
  console.error("Usage: node scripts/set-feature-status.mjs <feature-id> <status> [test-path]");
  console.error("  <feature-id>: feat-001, feat-002, chore-001, ...");
  console.error("  <status>: pending, approved, passing, archive");
  console.error("  [test-path]: opcional, ruta al archivo de test (se actualiza al pasar a passing)");
  process.exit(1);
}

if (!VALID_STATUSES.includes(newStatus)) {
  console.error(`Status invalido: ${newStatus}. Validos: ${VALID_STATUSES.join(", ")}`);
  process.exit(1);
}

// --- Leer features.json ---
const json = JSON.parse(readFileSync(featuresPath, "utf8"));
const feature = json.features.find((f) => f.id === id);

if (!feature) {
  console.error(`Feature ${id} no encontrado en features.json`);
  process.exit(1);
}

const oldStatus = feature.status;
feature.status = newStatus;

// --- Actualizar test si se pasa --test-path ---
if (testPath) {
  feature.test = testPath;
}

writeFileSync(featuresPath, JSON.stringify(json, null, 2) + "\n", "utf8");
console.log(`  ${id}: ${oldStatus} → ${newStatus}`);
if (testPath) console.log(`  ${id}: test → ${testPath}`);

// --- Mover AER entre directorios specs/ ---
const getSpecDir = (status) => {
  const map = { approved: "approved", passing: "passing", archive: "archive" };
  return map[status] || null;
};

const srcDir = getSpecDir(oldStatus);
const dstDir = getSpecDir(newStatus);

if (srcDir && dstDir && feature.aer) {
  const aerFile = basename(feature.aer);
  const srcPath = join(root, ".harness", "specs", srcDir, aerFile);
  const dstPath = join(root, ".harness", "specs", dstDir, aerFile);

  if (existsSync(srcPath)) {
    mkdirSync(join(root, ".harness", "specs", dstDir), { recursive: true });
    renameSync(srcPath, dstPath);
    feature.aer = `specs/${dstDir}/${aerFile}`;
    writeFileSync(featuresPath, JSON.stringify(json, null, 2) + "\n", "utf8");
    console.log(`  AER: specs/${srcDir}/${aerFile} → specs/${dstDir}/${aerFile}`);
  } else {
    console.log(`  [SKIP] AER no encontrado en specs/${srcDir}/${aerFile}`);
  }
}
