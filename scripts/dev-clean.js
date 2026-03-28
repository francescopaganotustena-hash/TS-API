const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = process.cwd();
const nextDir = path.join(rootDir, ".next");

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("[dev:clean] Cartella .next rimossa.");
} else {
  console.log("[dev:clean] Cartella .next non presente, nessuna pulizia necessaria.");
}

const nextBin = require.resolve("next/dist/bin/next");
const extraArgs = process.argv.slice(2);
const args = [nextBin, "dev", ...extraArgs];

console.log(`[dev:clean] Avvio: node ${args.join(" ")}`);

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: process.env,
  cwd: rootDir,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
