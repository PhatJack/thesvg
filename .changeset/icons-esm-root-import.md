---
"@thesvg/icons": patch
---

Fix the root ESM import and the `svg` icon module

`import { github } from "@thesvg/icons"` threw "SyntaxError: Unexpected
token 'export'" in node and failed to bundle in esbuild/Vite, because the
ESM barrel contained a TypeScript-only `export type` re-export. The types
are still exported from `index.d.ts`.

`@thesvg/icons/svg` declared `svg` twice (the slug clashed with the
module's own `svg` export), which also broke the root import since the
barrel loads every icon. Per-icon default exports no longer use the slug
as a local name, so any slug matching an export name now works. Import
names are unchanged.
