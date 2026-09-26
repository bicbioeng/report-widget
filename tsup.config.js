import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const shared = {
  format: ['esm', 'cjs'],
  target: 'es2019',
  sourcemap: true,
  splitting: false,
  esbuildOptions(o) { o.jsx = 'automatic'; },
  // Diagnostics report the widget version; baked in at build, never read from env.
  define: { __WIDGET_VERSION__: JSON.stringify(version) },
};

export default defineConfig([
  // esbuild keeps the entry's "use client" directive (verified in dist/index.{js,cjs}).
  { ...shared, entry: { index: 'src/index.js' }, clean: true },
  { ...shared, entry: { 'adapters/kids': 'src/adapters/kids.js', 'adapters/reads-graphql': 'src/adapters/reads-graphql.js' } },
]);
