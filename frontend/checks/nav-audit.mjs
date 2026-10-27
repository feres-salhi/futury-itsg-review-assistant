#!/usr/bin/env node
// T10-049 nav audit — the retirement gate: proves the SÜSIE shell has zero
// dead references after the Prüfakte removal. Exits non-zero on any hit.
// Scope: frontend/*.html + *.js for wiring identifiers; all frontend files
// for file-name references to the retired app.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(new URL("../", import.meta.url)));

const wiringIds = ["pruefakte", "advanced-frame", "data-adv", "side-adv", "advView", "advTitle"];
const fileScoped = ["pruefakte"];

let failures = 0;
for (const name of readdirSync(root)) {
  if (!name.startsWith("susie") && name !== "theme-init.js" && name !== "index.html") continue;
  const full = join(root, name);
  if (!statSync(full).isFile()) continue;
  const text = readFileSync(full, "utf8");
  for (const id of wiringIds) {
    const re = new RegExp(id.replace("-", "\\-"));
    if (re.test(text)) { console.error(`${name}: references retired identifier "${id}"`); failures++; }
  }
}
for (const name of readdirSync(root)) {
  const full = join(root, name);
  if (!statSync(full).isFile()) continue;
  const text = readFileSync(full, "utf8");
  for (const id of fileScoped) {
    if (text.includes(id)) { console.error(`${name}: references retired file "${id}"`); failures++; }
  }
}

// Every sidebar view must have a matching section and an I18N title key.
const html = readFileSync(join(root, "susie.html"), "utf8");
const js = readFileSync(join(root, "susie.js"), "utf8");
const views = [...html.matchAll(/data-view="([a-z]+)"/g)].map((m) => m[1]);
for (const v of new Set(views)) {
  if (!html.includes(`id="view-${v}"`)) { console.error(`susie.html: sidebar view "${v}" has no #view-${v} section`); failures++; }
  if (!new RegExp(`(^|\\s)${v}:`).test(js)) { console.error(`susie.js: view "${v}" has no I18N title key`); failures++; }
}

if (failures) { console.error(`nav audit: ${failures} failure(s)`); process.exit(1); }
console.log("nav audit: PASS — zero dead references, all views registered");
