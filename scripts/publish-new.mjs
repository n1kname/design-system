// Publishes every package whose version is not on npm yet, and nothing else: raising a
// version in package.json and pushing to main is the whole release. Runs in GitHub Actions,
// where npm trusts this repository's publish workflow (trusted publishing), so there is no
// token or login anywhere. --dry-run packs and says what it would publish.
//
// pnpm packs, so `workspace:*` becomes the real version; npm publishes, because npm is what
// trusted publishing is documented for.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Dependencies before what depends on them.
const PACKAGES = ['tokens', 'charts', 'components'];
const dry = process.argv.includes('--dry-run');
const out = mkdtempSync(join(tmpdir(), 'publish-'));

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
const published = (name, version) => {
  try {
    return run('npm', ['view', `${name}@${version}`, 'version', '--prefer-online']) === version;
  } catch {
    return false; // npm view fails on a version, or a package, it has never seen
  }
};

let count = 0;
for (const dir of PACKAGES) {
  const { name, version } = JSON.parse(readFileSync(`packages/${dir}/package.json`, 'utf8'));
  if (published(name, version)) {
    console.log(`  ${name}@${version} is on npm`);
    continue;
  }
  const tarball = join(out, run('pnpm', ['pack', '--pack-destination', out], `packages/${dir}`).split('\n').at(-1).split('/').at(-1));
  if (dry) console.log(`  ${name}@${version} would be published (${tarball})`);
  else {
    run('npm', ['publish', tarball, '--access', 'public']);
    console.log(`  ${name}@${version} published`);
  }
  count++;
}
console.log(count ? `${count} package(s) ${dry ? 'to publish' : 'published'}.` : 'Nothing to publish.');
