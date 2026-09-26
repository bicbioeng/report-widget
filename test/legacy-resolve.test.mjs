// Resolvers that ignore "exports" (CRA's Jest 26/27, older webpack, TS moduleResolution node)
// look for a real file or a directory package.json at <root>/<subpath>. Every public subpath needs one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const shipped = (p) => pkg.files.some((f) => p === f || p.startsWith(`${f}/`));

for (const key of Object.keys(pkg.exports).filter((k) => k !== '.' && k !== './package.json')) {
  test(`legacy resolution: ${key}`, () => {
    const p = join(root, key);
    assert.ok(existsSync(p), `${key} has no file or stub dir at the package root`);
    const targets = statSync(p).isFile() ? [p] : (() => {
      const stub = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8'));
      assert.ok(stub.main && stub.module && stub.types, `${key}/package.json needs main, module, types`);
      return [join(p, 'package.json'), ...[stub.main, stub.module, stub.types].map((t) => join(p, t))];
    })();
    for (const t of targets) {
      const rel = relative(root, t);
      assert.ok(existsSync(t), `${key} → ${rel} is missing`);
      assert.ok(shipped(rel), `${rel} is not in package.json "files"`);
    }
  });
}

test('root styles.css matches dist/styles.css', () => {
  assert.equal(readFileSync(join(root, 'styles.css'), 'utf8'), readFileSync(join(root, 'dist/styles.css'), 'utf8'));
});
