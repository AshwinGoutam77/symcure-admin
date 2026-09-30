#!/usr/bin/env node
/**
 * Design-token guard: fails if app/ or components/ (outside components/ui) use hardcoded
 * palette classes (text-slate-500, bg-blue-600 …), arbitrary hex colours, or ad-hoc px font sizes.
 * Use semantic tokens instead — see docs/DESIGN_SYSTEM.md.   Run: npm run lint:tokens
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PALETTE = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border|ring|divide|outline|fill|stroke|from|to|via)-(?:slate|gray|zinc|neutral|stone|blue|indigo|sky|cyan|emerald|green|teal|lime|amber|yellow|orange|red|rose|pink|violet|purple|fuchsia)-\d{2,3}/g;
const HEX = /(?:text|bg|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g;
const PX = /text-\[\d+(?:\.\d+)?px\]/g;

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (p.includes(join("components", "ui"))) return [];
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });

let problems = 0;
for (const file of [...walk("app"), ...walk("components")]) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    for (const [re, msg] of [[PALETTE, "hardcoded palette class"], [HEX, "arbitrary hex colour"], [PX, "ad-hoc px font size"]]) {
      const hits = line.match(re);
      if (hits) { problems += hits.length; console.log(`${file}:${i + 1}  ${msg}: ${hits.join(", ")}`); }
    }
  });
}
if (problems) { console.error(`\n✖ ${problems} token violation(s). Use semantic tokens (bg-card, text-muted-foreground, bg-success-soft, text-sm …).`); process.exit(1); }
console.log("✔ No token violations.");
