import { SEED_PROJECTS, SEED_COLUMNS, SEED_TASKS } from './seedData';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const performSeed = async (db: any) => {
  console.log('🌱 Seeding database with test data...');
  try {
    for (const p of SEED_PROJECTS) {
      const pid = generateId();
      db.exec({
        sql: 'INSERT INTO projects (id, name, description, color, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
        bind: [pid, p.name, p.description, p.color, p.startDate, p.endDate]
      });

      const colMap: Record<string, string> = {};
      for (const c of SEED_COLUMNS) {
        const cid = generateId();
        db.exec({
          sql: 'INSERT INTO columns (id, project_id, name, order_index, is_deletable) VALUES (?, ?, ?, ?, 0)',
          bind: [cid, pid, c.name, c.order]
        });
        colMap[c.name] = cid;
      }

      for (const t of SEED_TASKS) {
        const tid = generateId();
        const cid = colMap[t.columnName];
        if (!cid) continue;

        db.exec({
          sql: 'INSERT INTO tasks (id, column_id, project_id, assignee_ids, title, description, tag, tag_variant, progress, completed, due_date, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          bind: [tid, cid, pid, '', t.title, t.description, t.tag, t.tagVariant, t.progress, t.completed ? 1 : 0, t.dueDate, t.priority]
        });
      }
    }

    // Set login flags
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('hasSeenLanding', 'true');

    console.log('✅ Seeding complete');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  }
};
