/**
 * build-icons.ts
 *
 * Generates the @thesvg/icons distribution from the monorepo source data.
 *
 * Run with:
 *   bun run scripts/build-icons.ts
 *   tsx  scripts/build-icons.ts
 *
 * Output layout:
 *   dist/
 *     {slug}.js      ESM module per icon
 *     {slug}.cjs     CJS module per icon
 *     {slug}.d.ts    Type declarations per icon
 *     index.js       ESM barrel
 *     index.cjs      CJS barrel
 *     index.d.ts     Type barrel
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateCjs,
  generateCjsBarrel,
  generateDts,
  generateDtsBarrel,
  generateEsm,
  generateEsmBarrel,
  generateTypesDeclaration,
  type RawIcon,
  type RawIconVariants,
} from "./lib/codegen.ts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Root of the packages/icons package */
const PKG_ROOT = resolve(__dirname, "..");
/** Root of the thesvg monorepo */
const REPO_ROOT = resolve(PKG_ROOT, "../..");
const ICONS_JSON = join(REPO_ROOT, "src/data/icons.json");
const ICONS_PUBLIC = join(REPO_ROOT, "public/icons");
const DIST = join(PKG_ROOT, "dist");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read an SVG file from the public directory. Returns empty string on miss. */
function readSvg(slug: string, variant: string): string {
  // The JSON paths look like "/icons/{slug}/{variant}.svg" — strip the leading "/"
  // and resolve against the REPO_ROOT/public directory.
  const filePath = join(ICONS_PUBLIC, slug, `${variant}.svg`);
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf8").trim();
}

/**
 * Resolve the "primary" SVG for an icon.
 * Preference order: default → color → first available variant.
 */
function primarySvg(slug: string, variants: RawIconVariants): string {
  const order = ["default", "color", "mono", "light", "dark", "wordmark"];
  for (const v of order) {
    if (v in variants) {
      const content = readSvg(slug, v);
      if (content) return content;
    }
  }
  // Fall back to whatever variant is first in the object
  for (const v of Object.keys(variants)) {
    const content = readSvg(slug, v);
    if (content) return content;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("Reading icons.json…");
  const rawIcons: RawIcon[] = JSON.parse(readFileSync(ICONS_JSON, "utf8")) as RawIcon[];
  console.log(`Found ${rawIcons.length} icons.`);

  mkdirSync(DIST, { recursive: true });

  const processedSlugs: string[] = [];
  let skipped = 0;

  for (const icon of rawIcons) {
    const allVariants: Record<string, string> = {};
    for (const variantKey of Object.keys(icon.variants)) {
      const content = readSvg(icon.slug, variantKey);
      if (content) allVariants[variantKey] = content;
    }

    // Skip icons with no SVG data - don't ship empty modules
    const primary = primarySvg(icon.slug, icon.variants);
    if (!primary) {
      skipped++;
      continue;
    }

    // Write ESM module
    writeFileSync(join(DIST, `${icon.slug}.js`), generateEsm(icon, allVariants, primary) + "\n");
    // Write CJS module
    writeFileSync(join(DIST, `${icon.slug}.cjs`), generateCjs(icon, allVariants, primary) + "\n");
    // Write type declaration
    writeFileSync(join(DIST, `${icon.slug}.d.ts`), generateDts(icon) + "\n");

    processedSlugs.push(icon.slug);

    if (processedSlugs.length % 500 === 0) {
      console.log(`  Processed ${processedSlugs.length} / ${rawIcons.length}…`);
    }
  }

  if (skipped > 0) {
    console.log(`  Skipped ${skipped} icons with no SVG data.`);
  }

  // Shared types declaration
  writeFileSync(join(DIST, "types.d.ts"), generateTypesDeclaration() + "\n");
  // A minimal types.js so the ESM barrel can import from it at runtime if needed
  writeFileSync(
    join(DIST, "types.js"),
    `// @thesvg/icons -shared types (runtime stub, types are declaration-only)\nexport {};\n`,
  );
  writeFileSync(
    join(DIST, "types.cjs"),
    `"use strict";\n// @thesvg/icons -shared types (runtime stub)\nObject.defineProperty(exports, "__esModule", { value: true });\n`,
  );

  // Barrel files
  writeFileSync(join(DIST, "index.js"), generateEsmBarrel(processedSlugs) + "\n");
  writeFileSync(join(DIST, "index.cjs"), generateCjsBarrel(processedSlugs) + "\n");
  writeFileSync(join(DIST, "index.d.ts"), generateDtsBarrel(processedSlugs) + "\n");

  console.log(`\nDone. Built ${processedSlugs.length} icons.`);
  console.log(`Output: ${DIST}`);
}

main();
