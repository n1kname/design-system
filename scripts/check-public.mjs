// This repo is public and must hold no personal data. Fails on anything shaped
// like an email address, an IP address, map coordinates or a home path, and on
// any term in a private list kept outside the repo (PRIVATE_TERMS_FILE, one per
// line), so the list itself never has to be published.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/pnpm-lock\.yaml$/.test(f));

const shapes = [
  ['email', /\b[\w.+-]+@[a-z0-9-]+\.[a-z]{2,}\b/gi],
  ['ip address', /\b(?:10|127|172\.(?:1[6-9]|2\d|3[01])|192\.168)(?:\.\d{1,3}){2,3}\b/g],
  ['coordinates', /\b[345]\d\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/g],
  ['home path', /\/Users\/\w+|\/home\/\w+/g],
];
const terms = process.env.PRIVATE_TERMS_FILE
  ? readFileSync(process.env.PRIVATE_TERMS_FILE, 'utf8').split('\n').map((t) => t.trim()).filter(Boolean)
  : [];

let hits = 0;
const report = (file, what, match) => {
  hits++;
  console.log(`  ${file}: ${what}: ${match}`);
};
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [what, re] of shapes) for (const m of text.matchAll(re)) report(file, what, m[0]);
  const lower = text.toLowerCase();
  for (const term of terms) if (lower.includes(term.toLowerCase())) report(file, 'private term', term);
}
console.log(`${hits} hit(s) in ${files.length} files, ${terms.length} private terms checked.`);
process.exit(hits ? 1 : 0);
