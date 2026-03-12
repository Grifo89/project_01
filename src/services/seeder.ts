import { SEED_USERS, SEED_PROJECTS, SEED_COLUMNS, SEED_TASKS } from './seedData';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const performSeed = async (db: any) => {
  console.log('🌱 Seeding database with test data...');
  try {
    const myUserId = localStorage.getItem('myUserId') || 'me';
    
    // Ensure "Me" user exists
    db.exec({
      sql: 'INSERT OR IGNORE INTO users (id, name, avatar_color, initials, role) VALUES (?, ?, ?, ?, ?)',
      bind: [myUserId, 'Application User', '#1152d4', 'ME', 'Owner']
    });

    const otherUserIds: string[] = [];
    for (const u of SEED_USERS) {
      const id = generateId();
      db.exec({ 
        sql: 'INSERT INTO users (id, name, avatar_color, initials, role, email) VALUES (?, ?, ?, ?, ?, ?)', 
        bind: [id, u.name, u.avatarColor, u.initials, u.role, u.email] 
      });
      otherUserIds.push(id);
    }

    for (const p of SEED_PROJECTS) {
      const pid = generateId();
      db.exec({ 
        sql: 'INSERT INTO projects (id, name, description, color, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)', 
        bind: [pid, p.name, p.description, p.color, p.startDate, p.endDate] 
      });
      
      // Add all users to project
      const allUids = [myUserId, ...otherUserIds];
      for (const uid of allUids) {
        db.exec({ 
          sql: 'INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)', 
          bind: [pid, uid, uid === myUserId ? 'Owner' : 'Member'] 
        });
      }

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

        let tAssignees: string[] = [];
        if ((t as any).assigneeType === 'me') tAssignees = [myUserId];
        else if ((t as any).assigneeType === 'team') tAssignees = [myUserId, otherUserIds[0]];
        
        db.exec({ 
          sql: 'INSERT INTO tasks (id, column_id, project_id, assignee_ids, title, description, tag, tag_variant, progress, completed, due_date, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
          bind: [tid, cid, pid, tAssignees.join(','), t.title, t.description, t.tag, t.tagVariant, t.progress, t.completed ? 1 : 0, t.dueDate, t.priority] 
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
