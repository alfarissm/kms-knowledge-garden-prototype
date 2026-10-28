// Terapkan server/schema.sql ke Neon sekali jalan (Node ≥ 20).
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Pemakaian: node server/apply-schema.mjs "<DATABASE_URL>"');
  process.exit(1);
}

const sql = neon(url);
const script = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const statements = script
  .split(';')
  .map((statement) => statement.trim())
  .filter((statement) => statement.length > 0 && !statement.startsWith('-- ') || /[^;\s]/.test(statement));

for (const statement of statements) {
  const ready = statement.replace(/^\s*--[^\n]*\n\s*/gm, '');
  if (!ready) continue;
  await sql.query(ready, []);
}
console.log('Skema kebunku_db siap (tabel users/sessions/tree_states + index).');
