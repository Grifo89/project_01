import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
// @ts-ignore
import sqlite3WasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';
import { performSeed } from './seeder';

export interface Project { id: string; name: string; description?: string; color?: string; startDate?: string; endDate?: string; createdAt: string; sprintStartDay?: number; sprintDurationWeeks?: number; }
export interface Column { id: string; projectId: string; name: string; orderIndex: number; isDeletable?: boolean; }
export type Priority = 'high' | 'medium' | 'low';
export interface Task { id: string; columnId: string; projectId: string; sprintId?: string; assigneeIds?: string[]; title: string; description?: string; tag?: string; tagVariant?: string; priority: Priority; progress: number; dueDate?: string; completed: boolean; isArchived: boolean; orderIndex: number; timeSpent?: number; isTimerRunning?: boolean; timerStartedAt?: string; createdAt: string; }
export interface User { id: string; name: string; email?: string; role?: string; avatarColor: string; initials: string; avatarUrl?: string; }
export interface Activity { id: string; projectId: string; taskId?: string; userId?: string; type: string; content: string; createdAt: string; }

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
};

class IndexedDBStorage {
  private dbName = 'project_tracker_v5_tables';
  private storeName = 'tables';

  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName, { keyPath: 'tableName' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async readAllTables(): Promise<Record<string, any[]>> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).getAll();
      request.onsuccess = () => {
        const result: Record<string, any[]> = {};
        for (const item of request.result) { result[item.tableName] = item.data; }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async writeAllTables(data: Record<string, any[]>): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.clear();
      for (const [tableName, tableData] of Object.entries(data)) {
        store.put({ tableName, data: tableData });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

class DatabaseService {
  private db: any = null;
  private initialized = false;
  private storage = new IndexedDBStorage();
  private persistTimeout: any = null;

  private schedulePersist() {
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(() => this.persist(), 2000);
  }

  private async persist() {
    if (!this.db) return;
    try {
      const tables = ['projects', 'columns', 'users', 'project_users', 'tasks', 'subtasks', 'comments', 'activities'];
      const data: Record<string, any[]> = {};
      for (const table of tables) {
        const rows: any[] = [];
        const colNames: string[] = [];
        this.db.exec({ sql: `PRAGMA table_info(${table})`, callback: (info: any[]) => { colNames.push(info[1]); } });
        this.db.exec({ sql: `SELECT * FROM ${table}`, callback: (row: any[]) => {
          const obj: any = {};
          colNames.forEach((name, i) => { const camel = name.replace(/_([a-z])/g, (_, l) => l.toUpperCase()); obj[camel] = row[i]; });
          rows.push(obj);
        }});
        data[table] = rows;
      }
      await this.storage.writeAllTables(data);
    } catch (e) { console.error('Persistence failed:', e); }
  }

  async init() {
    if (this.initialized) return;
    const sqlite3: any = await sqlite3InitModule({ locateFile: (file: string) => file.endsWith('.wasm') ? sqlite3WasmUrl : file });
    this.db = new sqlite3.oo1.DB('/project_tracker_v5.db', 'ct');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.createTables();
    
    const projectCount = this.db.selectValue('SELECT count(*) FROM projects');
    if (projectCount === 0) {
      const tablesData = await this.storage.readAllTables();
      if (Object.keys(tablesData).length > 0) {
        this.db.exec('PRAGMA foreign_keys = OFF;');
        for (const [tableName, rows] of Object.entries(tablesData)) {
          for (const row of rows) {
            const keys = Object.keys(row);
            const sqlCols = keys.map(k => k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`));
            const placeholders = sqlCols.map(() => '?').join(', ');
            const values = Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
            try { this.db.exec({ sql: `INSERT OR IGNORE INTO ${tableName} (${sqlCols.join(', ')}) VALUES (${placeholders})`, bind: values }); } catch (e) {}
          }
        }
        this.db.exec('PRAGMA foreign_keys = ON;');
      } else {
        await performSeed(this.db);
        await this.persist();
      }
    }
    
    window.addEventListener('beforeunload', () => this.persist());
    this.initialized = true;
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, color TEXT, start_date TEXT, end_date TEXT, sprint_start_day INTEGER DEFAULT 1, sprint_duration_weeks INTEGER DEFAULT 2, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS columns (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, order_index INTEGER DEFAULT 0, is_deletable BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS project_members (
        id            TEXT PRIMARY KEY,
        project_id    TEXT NOT NULL,
        auth_uid      TEXT NOT NULL,
        display_name  TEXT NOT NULL,
        photo_url     TEXT,
        role          TEXT DEFAULT 'member',
        joined_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE (project_id, auth_uid)
      );

      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, column_id TEXT NOT NULL, project_id TEXT NOT NULL, sprint_id TEXT, assignee_ids TEXT, title TEXT NOT NULL, description TEXT, tag TEXT, tag_variant TEXT, priority TEXT DEFAULT 'medium', progress INTEGER DEFAULT 0, due_date TEXT, completed BOOLEAN DEFAULT 0, is_archived BOOLEAN DEFAULT 0, order_index INTEGER DEFAULT 0, time_spent INTEGER DEFAULT 0, is_timer_running BOOLEAN DEFAULT 0, timer_started_at TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS subtasks (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, title TEXT NOT NULL, completed BOOLEAN DEFAULT 0, order_index INTEGER DEFAULT 0, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT, user_id TEXT, type TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE);
    `);
  }

  async manualSeed() { await this.init(); this.db.exec('DELETE FROM project_users; DELETE FROM projects; DELETE FROM users; DELETE FROM columns; DELETE FROM tasks; DELETE FROM activities; DELETE FROM subtasks; DELETE FROM comments;'); await performSeed(this.db); await this.persist(); return true; }
  async getProjects(): Promise<Project[]> { await this.init(); const res: Project[] = []; this.db.exec({ sql: 'SELECT * FROM projects ORDER BY created_at DESC', callback: (r: any[]) => res.push({ id: r[0], name: r[1], description: r[2], color: r[3], startDate: r[4], endDate: r[5], sprintStartDay: r[6], sprintDurationWeeks: r[7], createdAt: r[8] }) }); return res; }
  async getProjectByName(name: string): Promise<Project | null> { const projects = await this.getProjects(); return projects.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === name.toLowerCase()) || null; }
  async addProject(p: any) { await this.init(); const id = generateId(); this.db.exec({ sql: 'INSERT INTO projects (id, name, description, color, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)', bind: [id, p.name, p.description || '', p.color || '#3b82f6', p.startDate || new Date().toISOString().split('T')[0], p.endDate || null] }); const cols = [{n: 'To Do', o: 0}, {n: 'In Progress', o: 1000}, {n: 'Review', o: 2000}, {n: 'Done', o: 3000}]; for (const c of cols) { this.db.exec({ sql: 'INSERT INTO columns (id, project_id, name, order_index, is_deletable) VALUES (?, ?, ?, ?, 0)', bind: [generateId(), id, c.n, c.o] }); } const myId = localStorage.getItem('myUserId'); if (myId) this.db.exec({ sql: 'INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)', bind: [id, myId, 'Owner'] }); this.schedulePersist(); return id; }
  async updateProject(id: string, u: any) { await this.init(); const keys = Object.keys(u); const set = keys.map(k => `${k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)} = ?`).join(', '); this.db.exec({ sql: `UPDATE projects SET ${set} WHERE id = ?`, bind: [...Object.values(u), id] }); this.schedulePersist(); }
  async deleteProject(id: string) { await this.init(); this.db.exec({ sql: 'DELETE FROM projects WHERE id = ?', bind: [id] }); this.schedulePersist(); }
  async getProjectTeam(projectId: string): Promise<User[]> { await this.init(); const res: User[] = []; this.db.exec({ sql: 'SELECT u.* FROM users u JOIN project_users pu ON u.id = pu.user_id WHERE pu.project_id = ?', bind: [projectId], callback: (r: any[]) => res.push({ id: r[0], name: r[1], avatarColor: r[2], initials: r[3], email: r[4], role: r[5], avatarUrl: r[6] }) }); return res; }
  async getUsers(): Promise<User[]> { await this.init(); const res: User[] = []; this.db.exec({ sql: 'SELECT * FROM users', callback: (r: any[]) => res.push({ id: r[0], name: r[1], avatarColor: r[2], initials: r[3], email: r[4], role: r[5], avatarUrl: r[6] }) }); return res; }
  async getColumns(pid: string): Promise<Column[]> { await this.init(); const res: Column[] = []; this.db.exec({ sql: 'SELECT * FROM columns WHERE project_id = ? ORDER BY order_index ASC', bind: [pid], callback: (r: any[]) => res.push({ id: r[0], projectId: r[1], name: r[2], orderIndex: r[3], isDeletable: !!r[4] }) }); return res; }
  async getTasks(projectId?: string): Promise<Task[]> { await this.init(); const res: Task[] = []; let sql = 'SELECT id, column_id, project_id, sprint_id, assignee_ids, title, description, tag, tag_variant, priority, progress, due_date, completed, is_archived, order_index, time_spent, is_timer_running, timer_started_at, created_at FROM tasks'; const binds: any[] = []; if (projectId) { sql += ' WHERE project_id = ?'; binds.push(projectId); } sql += ' ORDER BY order_index ASC'; this.db.exec({ sql, bind: binds, callback: (r: any[]) => res.push({ id: r[0], columnId: r[1], projectId: r[2], sprintId: r[3], assigneeIds: r[4] ? r[4].split(',').filter(Boolean) : [], title: r[5], description: r[6], tag: r[7], tagVariant: r[8], priority: r[9], progress: r[10], dueDate: r[11], completed: !!r[12], isArchived: !!r[13], orderIndex: r[14], timeSpent: r[15], isTimerRunning: !!r[16], timerStartedAt: r[17], createdAt: r[18] }) }); return res; }
  
  async addTask(t: any) {
    await this.init();
    const id = generateId();
    const myId = localStorage.getItem('myUserId');
    let finalAids = myId || '';
    if (t.assigneeIds && Array.isArray(t.assigneeIds)) {
      const filtered = t.assigneeIds.filter(Boolean);
      if (filtered.length > 0) finalAids = filtered.join(',');
    }
    this.db.exec({ sql: 'INSERT INTO tasks (id, column_id, project_id, assignee_ids, title, description, tag, tag_variant, priority, progress, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', bind: [id, t.columnId, t.projectId, finalAids, t.title, t.description || '', t.tag || '', t.tagVariant || 'primary', t.priority || 'medium', 0, t.dueDate || ''] });
    this.schedulePersist();
    return id;
  }

  async updateTask(id: string, u: any) {
    await this.init();
    if (u.assigneeIds) {
      u.assignee_ids = u.assigneeIds.filter(Boolean).join(',');
      delete u.assigneeIds;
    }
    const keys = Object.keys(u);
    if (keys.length === 0) return;
    const set = keys.map(k => `${k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)} = ?`).join(', ');
    this.db.exec({ sql: `UPDATE tasks SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, bind: [...Object.values(u), id] });
    this.schedulePersist();
  }

  async updateTaskColumn(tid: string, cid: string) { await this.init(); let name = ''; this.db.exec({ sql: 'SELECT name FROM columns WHERE id = ?', bind: [cid], callback: (r: any[]) => name = r[0] }); const done = name.toLowerCase() === 'done'; this.db.exec({ sql: `UPDATE tasks SET column_id = ?, completed = ? WHERE id = ?`, bind: [cid, done ? 1 : 0, tid] }); this.schedulePersist(); }
  async deleteTask(id: string) { await this.init(); this.db.exec({ sql: 'DELETE FROM tasks WHERE id = ?', bind: [id] }); this.schedulePersist(); }
  async getSubtasks(tid: string): Promise<any[]> { await this.init(); const res: any[] = []; this.db.exec({ sql: 'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC', bind: [tid], callback: (r: any[]) => res.push({ id: r[0], taskId: r[1], title: r[2], completed: !!r[3], orderIndex: r[4] }) }); return res; }
  async addSubtask(taskId: string, title: string) { await this.init(); const id = generateId(); this.db.exec({ sql: 'INSERT INTO subtasks (id, task_id, title, completed, order_index) VALUES (?, ?, ?, 0, 0)', bind: [id, taskId, title] }); this.schedulePersist(); return id; }
  async updateSubtask(id: string, completed: boolean) { await this.init(); this.db.exec({ sql: 'UPDATE subtasks SET completed = ? WHERE id = ?', bind: [completed ? 1 : 0, id] }); this.schedulePersist(); }
  async deleteSubtask(id: string) { await this.init(); this.db.exec({ sql: 'DELETE FROM subtasks WHERE id = ?', bind: [id] }); this.schedulePersist(); }
  async getComments(tid: string): Promise<any[]> { await this.init(); const res: any[] = []; this.db.exec({ sql: 'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC', bind: [tid], callback: (r: any[]) => res.push({ id: r[0], taskId: r[1], userId: r[2], content: r[3], createdAt: r[4] }) }); return res; }
  async addComment(taskId: string, userId: string, content: string) { await this.init(); const id = generateId(); this.db.exec({ sql: 'INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)', bind: [id, taskId, userId, content] }); this.schedulePersist(); return id; }
  async getActivities(pid: string): Promise<Activity[]> { await this.init(); const res: Activity[] = []; this.db.exec({ sql: 'SELECT * FROM activities WHERE project_id = ? ORDER BY created_at DESC', bind: [pid], callback: (r: any[]) => res.push({ id: r[0], projectId: r[1], taskId: r[2], userId: r[3], type: r[4], content: r[5], createdAt: r[6] }) }); return res; }
  async addActivity(a: any) { await this.init(); const id = generateId(); this.db.exec({ sql: 'INSERT INTO activities (id, project_id, task_id, user_id, type, content) VALUES (?, ?, ?, ?, ?, ?)', bind: [id, a.projectId, a.taskId || null, a.userId || null, a.type, a.content] }); this.schedulePersist(); return id; }
  async startTaskTimer(taskId: string) { await this.init(); this.db.exec({ sql: 'UPDATE tasks SET is_timer_running = 1, timer_started_at = ? WHERE id = ?', bind: [new Date().toISOString(), taskId] }); this.schedulePersist(); }
  async stopTaskTimer(taskId: string) { await this.init(); let timerStartedAt: string | null = null; let timeSpent = 0; this.db.exec({ sql: 'SELECT timer_started_at, time_spent FROM tasks WHERE id = ?', bind: [taskId], callback: (r: any[]) => { timerStartedAt = r[0]; timeSpent = r[1]; } }); if (timerStartedAt) { const elapsed = Math.floor((new Date().getTime() - new Date(timerStartedAt).getTime()) / 1000); this.db.exec({ sql: 'UPDATE tasks SET is_timer_running = 0, timer_started_at = NULL, time_spent = ? WHERE id = ?', bind: [timeSpent + elapsed, taskId] }); this.schedulePersist(); } }
}

export const db = new DatabaseService();
if (typeof window !== 'undefined') (window as any).db = db;
