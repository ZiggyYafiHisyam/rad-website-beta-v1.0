/* Writes frontend/src/demo/snapshot.json: what the seeded backend would send to
   a visitor, an operator and the owner. The frontend falls back to it when no
   backend is reachable (e.g. a Vercel preview). Regenerate: npm run demo:snapshot */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db.js';
import { stateFor } from '../src/services/snapshot.js';

const db = createDb(':memory:');
const users = db.prepare('SELECT id,role,name FROM users').all();
const out = { public: stateFor(db, null), operators: {}, owner: null, ownerUser: null };
for (const u of users) {
  const user = { id: u.id, role: u.role, name: u.name };
  if (u.role === 'owner' && !out.owner) { out.owner = stateFor(db, user); out.ownerUser = user; }
  if (u.role === 'operator') out.operators[u.name] = { user, state: stateFor(db, user) };
}
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'src', 'demo', 'snapshot.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log('Wrote', file, Object.keys(out.operators).join(', '));
