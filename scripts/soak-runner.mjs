import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const iterations = Number.parseInt(process.env.SOAK_ITERATIONS ?? "3", 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const vitestCli = path.join(repoRoot, "node_modules", "vitest", "vitest.mjs");
const tscCli = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
const viteCli = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

if (!Number.isFinite(iterations) || iterations < 1) {
  console.error("SOAK_ITERATIONS must be a positive integer.");
  process.exit(1);
}

const run = (cliPath, args, label) => {
  const started = Date.now();
  console.log(
    `\n[soak] ${label} -> node ${path.relative(repoRoot, cliPath)} ${args.join(" ")}`,
  );
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    stdio: "inherit",
    shell: false,
    cwd: repoRoot,
  });
  if (result.error) {
    console.error(`[soak] ${label} failed to start`, result.error);
    process.exit(1);
  }
  const elapsedMs = Date.now() - started;
  console.log(`[soak] ${label} completed in ${elapsedMs}ms`);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log(`[soak] starting backend soak run (${iterations} iterations)`);

for (let index = 1; index <= iterations; index += 1) {
  run(
    vitestCli,
    [
      "run",
      "tests/main",
      "tests/core",
      "tests/security",
      "tests/sync",
      "tests/ai",
    ],
    `iteration ${index}/${iterations}`,
  );
}

run(tscCli, ["-p", "tsconfig.main.json", "--noEmit"], "typecheck-main");
run(tscCli, ["-p", "tsconfig.renderer.json", "--noEmit"], "typecheck-renderer");
run(tscCli, ["-p", "tsconfig.main.json"], "build-main");
run(viteCli, ["build"], "build-renderer");

console.log("\n[soak] all soak checks passed");
