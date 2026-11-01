// Every component page follows the same contract, and every component has a page.
// Fails on a page missing a section or with them out of order, and on a component
// that no page imports.

import { readFileSync, readdirSync } from 'node:fs';

const PAGES = 'docs/src/content/docs/components';
const SOURCE = 'packages/components/src';
const SECTIONS = [
  "What it's for",
  'When not to use it',
  'Anatomy',
  'Variants',
  'States',
  'Tokens',
  'Keyboard and screen reader',
  'Content',
  'Status',
];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  ${msg}`);
};

const pages = readdirSync(PAGES).filter((f) => f.endsWith('.mdx'));
const all = pages.map((f) => readFileSync(`${PAGES}/${f}`, 'utf8')).join('\n');

for (const file of pages) {
  const text = readFileSync(`${PAGES}/${file}`, 'utf8');
  const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((h) => SECTIONS.includes(h));
  if (headings.join() !== SECTIONS.join()) {
    const missing = SECTIONS.filter((s) => !headings.includes(s));
    fail(`${file}: ${missing.length ? `missing ${missing.join(', ')}` : 'sections out of order'}`);
  }
}

for (const file of readdirSync(SOURCE).filter((f) => f.endsWith('.astro'))) {
  if (!all.includes(`@n1kname/components/${file}`)) fail(`${file}: no page imports it`);
}

console.log(`${failures} failure(s), ${pages.length} component pages.`);
if (failures) process.exit(1);
