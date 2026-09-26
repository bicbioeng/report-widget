// Ship the global stylesheet and the hand-written declarations (one copy per module format).
import { cpSync, readdirSync } from 'node:fs';

cpSync('src/styles.css', 'dist/styles.css');
for (const dir of ['', 'adapters/']) {
  for (const f of readdirSync(`types/${dir}`).filter((n) => n.endsWith('.d.ts'))) {
    cpSync(`types/${dir}${f}`, `dist/${dir}${f}`);
    cpSync(`types/${dir}${f}`, `dist/${dir}${f.replace(/\.d\.ts$/, '.d.cts')}`);
  }
}
