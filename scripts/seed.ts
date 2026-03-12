import fs from 'fs';
import path from 'path';
import { SEED_USERS, SEED_PROJECTS, SEED_COLUMNS, SEED_TASKS } from '../src/services/seedData';

const seedData = {
  users: SEED_USERS.map(u => ({ ...u, id: Math.random().toString(36).substring(2, 11) })),
  projects: SEED_PROJECTS.map(p => ({ ...p, id: Math.random().toString(36).substring(2, 11), createdAt: new Date().toISOString() })),
  columns: SEED_COLUMNS,
  tasks: SEED_TASKS
};

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(
  path.join(publicDir, 'seed.json'),
  JSON.stringify(seedData, null, 2)
);

console.log('✅ Seed data generated in public/seed.json');
