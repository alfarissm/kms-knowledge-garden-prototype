// Hapus akun demo/uji dari kebunku_db (mis. hasil smoke test), lalu tampilkan sisa tabel.
// Pemakaian: $env:DB="<connection string>"; node server/clean-demo.mjs
import { neon } from '@neondatabase/serverless';

const url = process.env.DB;
if (!url) {
  console.error('Env DB belum diset.');
  process.exit(1);
}
const sql = neon(url);
const before = await sql.query('SELECT id, name, email, role FROM users ORDER BY id');
console.log('sebelum:', JSON.stringify(before));
await sql.query('DELETE FROM users WHERE email LIKE $1', ['%@kms.test']);
const after = await sql.query('SELECT id, name, email, role FROM users ORDER BY id');
console.log('sesudah:', JSON.stringify(after));
const sessions = await sql.query('SELECT count(*)::int AS n FROM sessions');
const states = await sql.query('SELECT count(*)::int AS n FROM tree_states');
console.log('sessions:', sessions[0].n, '| tree_states:', states[0].n);
