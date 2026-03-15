import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
// @ts-ignore
import sqlite3WasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';
import { performSeed } from './seeder';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Owner {
  authUid: string;
  displayName: string;
  photoUrl: string | null;
  email: string | null;
}

export interface Collaborator {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  role: string;
  email: string | null;
}

export interface ProjectCollaborator {
  projectId: string;
  collaboratorId: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  sprintStartDay?: number;
  sprintDurationWeeks?: number;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  isDeletable?: boolean;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  columnId: string;
  projectId: string;
  sprintId?: string;
  assigneeIds?: string[];
  subtaskIds?: string[];
  title: string;
  description?: string;
  tag?: string;
  tagVariant?: string;
  priority: Priority;
  progress: number;
  dueDate?: string;
  completed: boolean;
  isArchived: boolean;
  orderIndex: number;
  timeSpent?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  orderIndex: number;
}

export interface Comment {
  id: string;
  taskId: string;
  collaboratorId: string | null;
  content: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  taskId?: string;
  collaboratorId?: string;
  type: string;
  content: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
};

// ─── IndexedDB persistence layer ─────────────────────────────────────────────

class IndexedDBStorage {
  private dbName = 'project_tracker_v6_tables';
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

// ─── Database service ─────────────────────────────────────────────────────────

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
      const tables = [
        'owner',
        'collaborators',
        'project_collaborators',
        'projects',
        'columns',
        'tasks',
        'subtasks',
        'comments',
        'activities',
      ];
      const data: Record<string, any[]> = {};
      for (const table of tables) {
        const rows: any[] = [];
        const colNames: string[] = [];
        this.db.exec({ sql: `PRAGMA table_info(${table})`, callback: (info: any[]) => { colNames.push(info[1]); } });
        this.db.exec({ sql: `SELECT * FROM ${table}`, callback: (row: any[]) => {
          const obj: any = {};
          colNames.forEach((name, i) => {
            const camel = name.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
            obj[camel] = row[i];
          });
          rows.push(obj);
        }});
        data[table] = rows;
      }
      await this.storage.writeAllTables(data);
    } catch (e) { console.error('Persistence failed:', e); }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init() {
    if (this.initialized) return;
    const sqlite3: any = await sqlite3InitModule({
      locateFile: (file: string) => file.endsWith('.wasm') ? sqlite3WasmUrl : file,
    });
    this.db = new sqlite3.oo1.DB('/project_tracker_v6.db', 'ct');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.createTables();

    const projectCount = this.db.selectValue('SELECT count(*) FROM projects');
    if (projectCount === 0) {
      const tablesData = await this.storage.readAllTables();
      if (Object.keys(tablesData).length > 0) {
        this.db.exec('PRAGMA foreign_keys = OFF;');
        const legacySkip = new Set(['users', 'project_users', 'project_members']);
        for (const [tableName, rows] of Object.entries(tablesData)) {
          if (legacySkip.has(tableName)) continue;
          for (const row of rows) {
            const keys = Object.keys(row);
            const sqlCols = keys.map(k => k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`));
            const placeholders = sqlCols.map(() => '?').join(', ');
            const values = Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
            try {
              this.db.exec({
                sql: `INSERT OR IGNORE INTO ${tableName} (${sqlCols.join(', ')}) VALUES (${placeholders})`,
                bind: values,
              });
            } catch (e) {}
          }
        }
        this.db.exec('PRAGMA foreign_keys = ON;');
      } else {
        await performSeed(this.db);
        await this.persist();
      }
    }

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.persist();
    });
    this.initialized = true;
  }

  // ─── Schema ────────────────────────────────────────────────────────────────

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS owner (
        auth_uid     TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        photo_url    TEXT,
        email        TEXT
      );

      CREATE TABLE IF NOT EXISTS collaborators (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#6366f1',
        initials     TEXT NOT NULL,
        role         TEXT,
        email        TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id                     TEXT PRIMARY KEY,
        name                   TEXT NOT NULL,
        description            TEXT,
        color                  TEXT,
        start_date             TEXT,
        end_date               TEXT,
        sprint_start_day       INTEGER DEFAULT 1,
        sprint_duration_weeks  INTEGER DEFAULT 2,
        created_at             DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_collaborators (
        project_id       TEXT NOT NULL,
        collaborator_id  TEXT NOT NULL,
        role             TEXT DEFAULT 'member',
        PRIMARY KEY (project_id, collaborator_id),
        FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE CASCADE,
        FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS columns (
        id           TEXT PRIMARY KEY,
        project_id   TEXT NOT NULL,
        name         TEXT NOT NULL,
        order_index  INTEGER DEFAULT 0,
        is_deletable BOOLEAN DEFAULT 1,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id               TEXT PRIMARY KEY,
        column_id        TEXT NOT NULL,
        project_id       TEXT NOT NULL,
        sprint_id        TEXT,
        assignee_ids     TEXT,
        subtask_ids      TEXT,
        title            TEXT NOT NULL,
        description      TEXT,
        tag              TEXT,
        tag_variant      TEXT,
        priority         TEXT DEFAULT 'medium',
        progress         INTEGER DEFAULT 0,
        due_date         TEXT,
        completed        BOOLEAN DEFAULT 0,
        is_archived      BOOLEAN DEFAULT 0,
        order_index      INTEGER DEFAULT 0,
        time_spent       INTEGER DEFAULT 0,
        is_timer_running BOOLEAN DEFAULT 0,
        timer_started_at TEXT,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id)  REFERENCES columns(id)  ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id          TEXT PRIMARY KEY,
        task_id     TEXT NOT NULL,
        title       TEXT NOT NULL,
        completed   BOOLEAN DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id               TEXT PRIMARY KEY,
        task_id          TEXT NOT NULL,
        collaborator_id  TEXT,
        content          TEXT NOT NULL,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id)         REFERENCES tasks(id)         ON DELETE CASCADE,
        FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS activities (
        id               TEXT PRIMARY KEY,
        project_id       TEXT NOT NULL,
        task_id          TEXT,
        collaborator_id  TEXT,
        type             TEXT NOT NULL,
        content          TEXT NOT NULL,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE CASCADE,
        FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE SET NULL
      );
    `);
  }

  // ─── Owner ─────────────────────────────────────────────────────────────────

  async getOwner(): Promise<Owner | null> {
    await this.init();
    let owner: Owner | null = null;
    this.db.exec({
      sql: 'SELECT auth_uid, display_name, photo_url, email FROM owner LIMIT 1',
      callback: (r: any[]) => { owner = { authUid: r[0], displayName: r[1], photoUrl: r[2] ?? null, email: r[3] ?? null }; },
    });
    return owner;
  }

  async setOwner(authUid: string, displayName: string, photoUrl?: string | null, email?: string | null): Promise<void> {
    await this.init();
    this.db.exec({
      sql: `INSERT INTO owner (auth_uid, display_name, photo_url, email) VALUES (?, ?, ?, ?)
            ON CONFLICT(auth_uid) DO UPDATE SET display_name=excluded.display_name, photo_url=excluded.photo_url, email=excluded.email`,
      bind: [authUid, displayName, photoUrl ?? null, email ?? null],
    });
    this.schedulePersist();
  }

  // ─── Collaborators ─────────────────────────────────────────────────────────

  async getCollaborators(): Promise<Collaborator[]> {
    await this.init();
    const res: Collaborator[] = [];
    this.db.exec({
      sql: 'SELECT id, name, avatar_color, initials, role, email FROM collaborators ORDER BY name ASC',
      callback: (r: any[]) => res.push({ id: r[0], name: r[1], avatarColor: r[2], initials: r[3], role: r[4], email: r[5] ?? null }),
    });
    return res;
  }

  async getProjectCollaborators(projectId: string): Promise<Collaborator[]> {
    await this.init();
    const res: Collaborator[] = [];
    this.db.exec({
      sql: `SELECT c.id, c.name, c.avatar_color, c.initials, c.role, c.email
            FROM collaborators c
            JOIN project_collaborators pc ON pc.collaborator_id = c.id
            WHERE pc.project_id = ?
            ORDER BY c.name ASC`,
      bind: [projectId],
      callback: (r: any[]) => res.push({ id: r[0], name: r[1], avatarColor: r[2], initials: r[3], role: r[4], email: r[5] ?? null }),
    });
    return res;
  }

  async addCollaborator(c: Omit<Collaborator, 'id'>): Promise<string> {
    await this.init();
    const id = generateId();
    this.db.exec({
      sql: 'INSERT INTO collaborators (id, name, avatar_color, initials, role, email) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [id, c.name, c.avatarColor, c.initials, c.role ?? null, c.email ?? null],
    });
    this.schedulePersist();
    return id;
  }

  async updateCollaborator(id: string, updates: Partial<Omit<Collaborator, 'id'>>): Promise<void> {
    await this.init();
    const keys = Object.keys(updates);
    const set = keys.map(k => `${k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)} = ?`).join(', ');
    this.db.exec({ sql: `UPDATE collaborators SET ${set} WHERE id = ?`, bind: [...Object.values(updates), id] });
    this.schedulePersist();
  }

  async deleteCollaborator(id: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM collaborators WHERE id = ?', bind: [id] });
    this.schedulePersist();
  }

  async addCollaboratorToProject(projectId: string, collaboratorId: string, role: string = 'member'): Promise<void> {
    await this.init();
    this.db.exec({
      sql: 'INSERT OR IGNORE INTO project_collaborators (project_id, collaborator_id, role) VALUES (?, ?, ?)',
      bind: [projectId, collaboratorId, role],
    });
    this.schedulePersist();
  }

  async removeCollaboratorFromProject(projectId: string, collaboratorId: string): Promise<void> {
    await this.init();
    this.db.exec({
      sql: 'DELETE FROM project_collaborators WHERE project_id = ? AND collaborator_id = ?',
      bind: [projectId, collaboratorId],
    });
    this.schedulePersist();
  }

  // ─── Projects ──────────────────────────────────────────────────────────────

  async getProjects(): Promise<Project[]> {
    await this.init();
    const res: Project[] = [];
    this.db.exec({
      sql: 'SELECT id, name, description, color, start_date, end_date, sprint_start_day, sprint_duration_weeks, created_at FROM projects ORDER BY created_at DESC',
      callback: (r: any[]) => res.push({ id: r[0], name: r[1], description: r[2], color: r[3], startDate: r[4], endDate: r[5], sprintStartDay: r[6], sprintDurationWeeks: r[7], createdAt: r[8] }),
    });
    return res;
  }

  async getProjectByName(name: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === name.toLowerCase()) || null;
  }

  async addProject(p: Omit<Project, 'id' | 'createdAt'>): Promise<string> {
    await this.init();
    const id = generateId();
    this.db.exec({
      sql: 'INSERT INTO projects (id, name, description, color, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [id, p.name, p.description || '', p.color || '#3b82f6', p.startDate || new Date().toISOString().split('T')[0], p.endDate || null],
    });
    const cols = [{ n: 'To Do', o: 0 }, { n: 'In Progress', o: 1000 }, { n: 'Review', o: 2000 }, { n: 'Done', o: 3000 }];
    for (const c of cols) {
      this.db.exec({ sql: 'INSERT INTO columns (id, project_id, name, order_index, is_deletable) VALUES (?, ?, ?, ?, 0)', bind: [generateId(), id, c.n, c.o] });
    }
    this.schedulePersist();
    return id;
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    await this.init();
    const keys = Object.keys(updates);
    const set = keys.map(k => `${k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)} = ?`).join(', ');
    this.db.exec({ sql: `UPDATE projects SET ${set} WHERE id = ?`, bind: [...Object.values(updates), id] });
    this.schedulePersist();
  }

  async deleteProject(id: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM projects WHERE id = ?', bind: [id] });
    this.schedulePersist();
  }

  // ─── Columns ───────────────────────────────────────────────────────────────

  async getColumns(projectId: string): Promise<Column[]> {
    await this.init();
    const res: Column[] = [];
    this.db.exec({
      sql: 'SELECT id, project_id, name, order_index, is_deletable FROM columns WHERE project_id = ? ORDER BY order_index ASC',
      bind: [projectId],
      callback: (r: any[]) => res.push({ id: r[0], projectId: r[1], name: r[2], orderIndex: r[3], isDeletable: !!r[4] }),
    });
    return res;
  }

  async addColumn(projectId: string, name: string, orderIndex: number): Promise<string> {
    await this.init();
    const id = generateId();
    this.db.exec({ sql: 'INSERT INTO columns (id, project_id, name, order_index) VALUES (?, ?, ?, ?)', bind: [id, projectId, name, orderIndex] });
    this.schedulePersist();
    return id;
  }

  async deleteColumn(id: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM columns WHERE id = ?', bind: [id] });
    this.schedulePersist();
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  async getTasks(projectId?: string): Promise<Task[]> {
    await this.init();
    const res: Task[] = [];
    let sql = `SELECT id, column_id, project_id, sprint_id, assignee_ids, subtask_ids,
               title, description, tag, tag_variant, priority, progress, due_date,
               completed, is_archived, order_index, time_spent, is_timer_running,
               timer_started_at, created_at FROM tasks`;
    const binds: any[] = [];
    if (projectId) { sql += ' WHERE project_id = ?'; binds.push(projectId); }
    sql += ' ORDER BY order_index ASC';
    this.db.exec({
      sql, bind: binds,
      callback: (r: any[]) => res.push({
        id: r[0], columnId: r[1], projectId: r[2], sprintId: r[3],
        assigneeIds: r[4] ? r[4].split(',').filter(Boolean) : [],
        subtaskIds:  r[5] ? r[5].split(',').filter(Boolean) : [],
        title: r[6], description: r[7], tag: r[8], tagVariant: r[9],
        priority: r[10], progress: r[11], dueDate: r[12],
        completed: !!r[13], isArchived: !!r[14], orderIndex: r[15],
        timeSpent: r[16], isTimerRunning: !!r[17], timerStartedAt: r[18], createdAt: r[19],
      }),
    });
    return res;
  }

  async addTask(t: Omit<Task, 'id' | 'createdAt' | 'subtaskIds'>): Promise<string> {
    await this.init();
    const id = generateId();
    const assigneeIds = (t.assigneeIds ?? []).filter(Boolean).join(',');
    this.db.exec({
      sql: `INSERT INTO tasks
            (id, column_id, project_id, assignee_ids, subtask_ids, title, description,
             tag, tag_variant, priority, progress, due_date)
            VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)`,
      bind: [id, t.columnId, t.projectId, assigneeIds, t.title, t.description || '', t.tag || '', t.tagVariant || 'primary', t.priority || 'medium', 0, t.dueDate || ''],
    });
    this.schedulePersist();
    return id;
  }

  async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    await this.init();
    const mapped: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      const col = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
      mapped[col] = Array.isArray(v) ? v.join(',') : v;
    }
    const set = Object.keys(mapped).map(k => `${k} = ?`).join(', ');
    this.db.exec({ sql: `UPDATE tasks SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, bind: [...Object.values(mapped), id] });
    this.schedulePersist();
  }

  async updateTaskColumn(taskId: string, columnId: string): Promise<void> {
    await this.init();
    let name = '';
    this.db.exec({ sql: 'SELECT name FROM columns WHERE id = ?', bind: [columnId], callback: (r: any[]) => { name = r[0]; } });
    const done = name.toLowerCase() === 'done';
    this.db.exec({ sql: 'UPDATE tasks SET column_id = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', bind: [columnId, done ? 1 : 0, taskId] });
    this.schedulePersist();
  }

  async deleteTask(id: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM tasks WHERE id = ?', bind: [id] });
    this.schedulePersist();
  }

  async startTaskTimer(taskId: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'UPDATE tasks SET is_timer_running = 1, timer_started_at = ? WHERE id = ?', bind: [new Date().toISOString(), taskId] });
    this.schedulePersist();
  }

  async stopTaskTimer(taskId: string): Promise<void> {
    await this.init();
    let timerStartedAt: string | null = null;
    let timeSpent = 0;
    this.db.exec({ sql: 'SELECT timer_started_at, time_spent FROM tasks WHERE id = ?', bind: [taskId], callback: (r: any[]) => { timerStartedAt = r[0]; timeSpent = r[1]; } });
    if (timerStartedAt) {
      const elapsed = Math.floor((new Date().getTime() - new Date(timerStartedAt).getTime()) / 1000);
      this.db.exec({ sql: 'UPDATE tasks SET is_timer_running = 0, timer_started_at = NULL, time_spent = ? WHERE id = ?', bind: [timeSpent + elapsed, taskId] });
      this.schedulePersist();
    }
  }

  // ─── Subtasks ──────────────────────────────────────────────────────────────

  async getSubtasks(taskId: string): Promise<Subtask[]> {
    await this.init();
    const res: Subtask[] = [];
    this.db.exec({
      sql: 'SELECT id, task_id, title, completed, order_index FROM subtasks WHERE task_id = ? ORDER BY order_index ASC',
      bind: [taskId],
      callback: (r: any[]) => res.push({ id: r[0], taskId: r[1], title: r[2], completed: !!r[3], orderIndex: r[4] }),
    });
    return res;
  }

  async addSubtask(taskId: string, title: string): Promise<string> {
    await this.init();
    const id = generateId();
    this.db.exec({ sql: 'INSERT INTO subtasks (id, task_id, title, completed, order_index) VALUES (?, ?, ?, 0, 0)', bind: [id, taskId, title] });
    // Keep subtask_ids on the parent task in sync
    this.db.exec({ sql: `UPDATE tasks SET subtask_ids = CASE WHEN subtask_ids = '' OR subtask_ids IS NULL THEN ? ELSE subtask_ids || ',' || ? END WHERE id = ?`, bind: [id, id, taskId] });
    this.schedulePersist();
    return id;
  }

  async updateSubtask(id: string, completed: boolean): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'UPDATE subtasks SET completed = ? WHERE id = ?', bind: [completed ? 1 : 0, id] });
    this.schedulePersist();
  }

  async deleteSubtask(id: string, taskId: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM subtasks WHERE id = ?', bind: [id] });
    // Remove id from parent task's subtask_ids
    let current = '';
    this.db.exec({ sql: 'SELECT subtask_ids FROM tasks WHERE id = ?', bind: [taskId], callback: (r: any[]) => { current = r[0] ?? ''; } });
    const updated = current.split(',').filter(s => s && s !== id).join(',');
    this.db.exec({ sql: 'UPDATE tasks SET subtask_ids = ? WHERE id = ?', bind: [updated, taskId] });
    this.schedulePersist();
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  async getComments(taskId: string): Promise<Comment[]> {
    await this.init();
    const res: Comment[] = [];
    this.db.exec({
      sql: 'SELECT id, task_id, collaborator_id, content, created_at FROM comments WHERE task_id = ? ORDER BY created_at DESC',
      bind: [taskId],
      callback: (r: any[]) => res.push({ id: r[0], taskId: r[1], collaboratorId: r[2] ?? null, content: r[3], createdAt: r[4] }),
    });
    return res;
  }

  async addComment(taskId: string, content: string, collaboratorId?: string | null): Promise<string> {
    await this.init();
    const id = generateId();
    this.db.exec({ sql: 'INSERT INTO comments (id, task_id, collaborator_id, content) VALUES (?, ?, ?, ?)', bind: [id, taskId, collaboratorId ?? null, content] });
    this.schedulePersist();
    return id;
  }

  async deleteComment(id: string): Promise<void> {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM comments WHERE id = ?', bind: [id] });
    this.schedulePersist();
  }

  // ─── Activities ────────────────────────────────────────────────────────────

  async getActivities(projectId: string): Promise<Activity[]> {
    await this.init();
    const res: Activity[] = [];
    this.db.exec({
      sql: 'SELECT id, project_id, task_id, collaborator_id, type, content, created_at FROM activities WHERE project_id = ? ORDER BY created_at DESC',
      bind: [projectId],
      callback: (r: any[]) => res.push({ id: r[0], projectId: r[1], taskId: r[2], collaboratorId: r[3], type: r[4], content: r[5], createdAt: r[6] }),
    });
    return res;
  }

  async addActivity(a: Omit<Activity, 'id' | 'createdAt'>): Promise<string> {
    await this.init();
    const id = generateId();
    this.db.exec({
      sql: 'INSERT INTO activities (id, project_id, task_id, collaborator_id, type, content) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [id, a.projectId, a.taskId || null, a.collaboratorId || null, a.type, a.content],
    });
    this.schedulePersist();
    return id;
  }

  // ─── Seed / reset ──────────────────────────────────────────────────────────

  async manualSeed(): Promise<boolean> {
    await this.init();
    this.db.exec(`
      DELETE FROM activities;
      DELETE FROM comments;
      DELETE FROM subtasks;
      DELETE FROM tasks;
      DELETE FROM columns;
      DELETE FROM project_collaborators;
      DELETE FROM projects;
      DELETE FROM collaborators;
    `);
    await performSeed(this.db);
    await this.persist();
    return true;
  }
}

export const db = new DatabaseService();
if (typeof window !== 'undefined') (window as any).db = db;
