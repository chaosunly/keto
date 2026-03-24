/**
 * Concatenate individual namespace TypeScript files into a single bundle.
 *
 * Keto's embedded OPL engine cannot resolve cross-file imports, so we inline
 * every file in dependency order and strip only the module-system lines
 * (import / export statements). All TypeScript type annotations — including the
 * critical `related: { … }` field types that define Keto's relation schema —
 * are preserved verbatim.
 *
 * Usage (from the keto/ directory):
 *   node build-namespaces.mjs
 * Output: bundle.ts  (consumed by the Dockerfile build stage)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const NS_DIR = join(__dir, "namespaces");

/**
 * Files in dependency order.
 * roleBinding ↔ gitlabGroup are mutually circular; both reference each other
 * only in `related` type annotations and `permits` closures — all resolved at
 * Keto runtime, so declaration order is irrelevant for correctness.
 */
const FILES = [
  "user.ts",
  "globalRole.ts",
  "group.ts",
  "role.ts",
  "roleBinding.ts",
  "gitlabGroup.ts",
  "gitlabProject.ts",
  "organization.ts",
  "matrixOrg.ts",
  "matrixSpace.ts",
  "matrixRoom.ts",
];

function stripModuleLines(src) {
  return (
    src
      // Remove import lines: import { … } from "…"
      .replace(/^import\b[^\n]*\n/gm, "")
      // Remove `export` keyword from class declarations
      .replace(/^export\s+(class\s)/gm, "$1")
      // Remove re-export lines: export { X, Y } from "./z"  or  export { X }
      .replace(/^export\s*\{[^}]*\}[^\n]*\n/gm, "")
      .trim()
  );
}

const parts = FILES.map((file) => {
  const src = readFileSync(join(NS_DIR, file), "utf8");
  return `// ── ${file} ${"─".repeat(Math.max(0, 60 - file.length))}\n${stripModuleLines(src)}`;
});

const bundle = parts.join("\n\n") + "\n";
const outFile = join(__dir, "bundle.ts");
writeFileSync(outFile, bundle, "utf8");

console.log(`✓ bundle.ts  (${FILES.length} files, ${bundle.length} bytes)`);
