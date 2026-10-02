---
"@thesvg/icons": patch
"@thesvg/react": patch
"@thesvg/react-native": patch
"@thesvg/vue": patch
"@thesvg/svelte": patch
---

Add the missing viewBox to 229 icon SVGs

The React, React Native, Vue and Svelte components fall back to viewBox "0 0 24 24"
when an SVG has none, so 15 logos drawn on larger canvases (Amazon,
Amazon Music, BBC, Best Buy, Citibank, Disney and others) rendered
cropped or as a solid block. All 229 affected SVGs, including 214 GCP
icons, also failed to scale when the raw `svg` string was sized with CSS.
