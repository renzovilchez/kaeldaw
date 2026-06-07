import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const wasmDir = join(root, "crates", "dsp");

function runWasmPack() {
  const cmd = "wasm-pack build --target bundler --out-dir pkg";
  console.log(`Building WASM from ${wasmDir}`);
  execSync(cmd, { cwd: wasmDir, stdio: "inherit" });
}

function findVswhere() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe",
    "C:\\Program Files\\Microsoft Visual Studio\\Installer\\vswhere.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  const progX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const fallback = join(progX86, "Microsoft Visual Studio", "Installer", "vswhere.exe");
  if (existsSync(fallback)) return fallback;
  return null;
}

function buildWindows() {
  const vswhere = findVswhere();
  if (!vswhere) {
    console.error("vswhere.exe not found. Install Visual Studio Build Tools (with VC++ workload).");
    process.exit(1);
  }

  const vsInstallPath = execSync(
    `"${vswhere}" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`,
    { encoding: "utf8" }
  ).trim();

  if (!vsInstallPath) {
    console.error("No Visual Studio installation with VC++ tools found. Install the VC++ workload.");
    process.exit(1);
  }

  const vcvars64 = join(vsInstallPath, "VC", "Auxiliary", "Build", "vcvars64.bat");
  if (!existsSync(vcvars64)) {
    console.error(`vcvars64.bat not found at ${vcvars64}`);
    process.exit(1);
  }

  const cargoBin = join(process.env.USERPROFILE, ".cargo", "bin");
  const cmd = `"${vcvars64}" >nul 2>&1 && wasm-pack build --target bundler --out-dir pkg`;

  console.log(`Building WASM from ${wasmDir}`);
  execSync(cmd, {
    cwd: wasmDir,
    shell: "cmd.exe",
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${cargoBin};${process.env.PATH}`,
    },
  });
}

if (process.platform === "win32") {
  buildWindows();
} else {
  runWasmPack();
}
