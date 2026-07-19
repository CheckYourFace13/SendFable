import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = join(process.cwd(), "src", "lib", "__tests__");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => join(dir, f));

if (files.length === 0) {
  console.error("No test files found");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", ...files],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
