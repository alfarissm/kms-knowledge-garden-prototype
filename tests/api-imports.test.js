import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// Penjaga statis: setiap fungsi API yang dipakai main.js harus diimpor dari api.js.
// Kegagalan lama: apiAdminDeleteAccount dipakai di applyAdminAccountAction
// tetapi tidak ada di daftar import, sehingga delete akun ReferenceError.

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../src/api.js', import.meta.url), 'utf8');

const importBlockEnd = main.indexOf("} from './api.js';");
expect(importBlockEnd).toBeGreaterThan(-1);

const apiImports = new Set([...main.slice(0, importBlockEnd).matchAll(/^ {2}(api\w+),$/gm)].map((match) => match[1]));
const apiExports = new Set([...apiSource.matchAll(/^export (?:async )?function (\w+)/gm)].map((match) => match[1]));

it('imports every api function that main.js uses', () => {
  const body = main.slice(importBlockEnd);
  const used = new Set([...body.matchAll(/\bapi[A-Z]\w*\b/g)].map((match) => match[0]));
  const missing = [...used].filter((name) => !apiImports.has(name));
  expect(missing).toEqual([]);
});

it('only imports api functions that api.js exports', () => {
  const unknown = [...apiImports].filter((name) => !apiExports.has(name));
  expect(unknown).toEqual([]);
});
