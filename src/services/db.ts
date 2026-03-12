import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
// @ts-ignore
import sqlite3WasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  createdAt: string;
  sprintStartDay?: number; // 0-6 (Sunday-Saturday)
  sprintDurationWeeks?: number; // 1-4 weeks
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
  assigneeId?: string;
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
  timeSpent?: number; // in seconds
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

export interface User {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarColor: string;
  initials: string;
  avatarUrl?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  taskId?: string;
  userId?: string;
  type: string;
  content: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

// IndexedDB-based storage for SQLite persistence (stores data as JSON)
class IndexedDBStorage {
  private dbName = 'project_tracker_data';
  private storeName = 'tables';
  private idb: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.idb) return this.idb;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.idb = request.result;
        resolve(this.idb);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'tableName' });
        }
      };
    });
  }

  async readTable(tableName: string): Promise<any[] | null> {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(tableName);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  async writeTable(tableName: string, data: any[]): Promise<void> {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ tableName, data });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async readAllTables(): Promise<Record<string, any[]>> {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result: Record<string, any[]> = {};
        for (const item of request.result) {
          result[item.tableName] = item.data;
        }
        resolve(result);
      };
    });
  }

  async writeAllTables(data: Record<string, any[]>): Promise<void> {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Clear all existing data
      store.clear();
      
      // Write all tables
      for (const [tableName, tableData] of Object.entries(data)) {
        store.put({ tableName, data: tableData });
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

class DatabaseService {
  private db: any = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private storage: IndexedDBStorage;
  private persistTimeout: any = null;

  constructor() {
    this.storage = new IndexedDBStorage();
  }

  private schedulePersist() {
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    
    this.persistTimeout = setTimeout(() => {
      if (this.db) {
        console.log('Executing scheduled persistence...');
        this.persistToIndexedDB(this.db);
      }
      this.persistTimeout = null;
    }, 1000); // Debounce for 1 second
  }

  async init() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    console.log('Starting database initialization...');
    this.initializing = (async () => {
      try {
        // @ts-ignore - sqlite3InitModule accepts configuration object in JS
        const sqlite3: any = await sqlite3InitModule({
          locateFile: (file: string) => {
            if (file.endsWith('.wasm')) {
              console.log('Locating WASM file:', sqlite3WasmUrl);
              return sqlite3WasmUrl;
            }
            return file;
          }
        });

        console.log('SQLite WASM module loaded successfully');

        // Try OPFS first
        if (sqlite3.opfs) {
          try {
            this.db = new sqlite3.oo1.OpfsDb('/project_tracker_v2.db');
            console.log('Using OPFS SQLite database');
          } catch (opfsErr) {
            console.warn('OPFS available but failed to initialize:', opfsErr);
            this.db = await this.createIndexedDBBackedDB(sqlite3);
          }
        } else {
          console.warn('OPFS not available, trying IndexedDB-backed database...');
          this.db = await this.createIndexedDBBackedDB(sqlite3);
        }

        if (!this.db) {
          throw new Error('Failed to create database instance');
        }

        this.db.exec('PRAGMA foreign_keys = ON;');
        this.createTables();
        
        // Try to load data from IndexedDB (only for in-memory DB)
        await this.loadFromIndexedDBIfNeeded();
        
        this.initialized = true;
        console.log('Database initialization complete and tables created');
      } catch (err) {
        console.error('CRITICAL: Failed to initialize SQLite:', err);
        this.initialized = false;
        throw err;
      } finally {
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  private async createIndexedDBBackedDB(sqlite3: any): Promise<any> {
    console.log('Creating IndexedDB-backed SQLite database...');
    
    const dbName = '/project_tracker_idb.db';
    
    try {
      // Create an in-memory database
      const db = new sqlite3.oo1.DB(dbName, 'ct');
      
      // Set up auto-persist on context loss (before page closes)
      const persistData = async () => {
        console.log('Persisting data to IndexedDB...');
        await this.persistToIndexedDB(db);
      };
      
      // Listen for page unload
      window.addEventListener('beforeunload', persistData);
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          persistData();
        }
      });
      
      // Also persist periodically
      setInterval(persistData, 30000); // Every 30 seconds
      
      console.log('Created SQLite database with IndexedDB persistence');
      return db;
    } catch (err) {
      console.error('Failed to create IndexedDB-backed database:', err);
      throw err;
    }
  }

  private async loadFromIndexedDBIfNeeded(): Promise<void> {
    // Check if we need to load data from IndexedDB
    // Only load if tables are empty
    const projectCount = this.db.selectValue('SELECT count(*) FROM projects');
    
    if (projectCount === 0) {
      console.log('Tables are empty, trying to load from IndexedDB...');
      try {
        const tablesData = await this.storage.readAllTables();
        const tableNames = Object.keys(tablesData);
        
        if (tableNames.length > 0) {
          console.log('Found existing data in IndexedDB, loading...');
          
          // Load data for each table
          for (const tableName of tableNames) {
            const rows = tablesData[tableName];
            if (rows && rows.length > 0) {
              // Insert each row
              for (const row of rows) {
                const cols = Object.keys(row).map(c => c.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`));
                const placeholders = cols.map(() => '?').join(', ');
                const values = cols.map(col => {
                  const val = row[col.replace(/[A-Z]/g, l => `${l}`)];
                  if (typeof val === 'object') return JSON.stringify(val);
                  return val;
                });
                
                try {
                  this.db.exec({
                    sql: `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
                    bind: values
                  });
                } catch (e) {
                  // Ignore duplicate key errors
                }
              }
            }
          }
          console.log('Loaded', tableNames.length, 'tables from IndexedDB');
          
          // Verify data was loaded
          const newProjectCount = this.db.selectValue('SELECT count(*) FROM projects');
          console.log('Loaded projects count:', newProjectCount);
        } else {
          console.log('No data found in IndexedDB, will seed new data');
          this.seed();
        }
      } catch (e) {
        console.warn('Could not load from IndexedDB:', e);
        console.log('Will seed new data');
        this.seed();
      }
    } else {
      console.log('Database already has data, skipping IndexedDB load');
    }
  }

  private async persistToIndexedDB(db: any): Promise<void> {
    try {
      // Export all table data
      const tables = ['projects', 'columns', 'users', 'sprints', 'tasks', 'subtasks', 'comments', 'activities', 'tags'];
      const data: Record<string, any[]> = {};
      
      for (const table of tables) {
        try {
          const rows: any[] = [];
          db.exec({
            sql: `SELECT * FROM ${table}`,
            callback: (row: any[]) => {
              // Get column names first
              const cols = db.exec(`PRAGMA table_info(${table})`);
              const colNames = cols[0]?.values?.map((v: any[]) => v[1]) || [];
              
              const obj: Record<string, any> = {};
              colNames.forEach((col: string, i: number) => {
                // Convert snake_case back to camelCase
                const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                obj[camelCol] = row[i];
              });
              rows.push(obj);
            }
          });
          data[table] = rows;
        } catch (e) {
          // Table might not exist
          data[table] = [];
        }
      }
      
      await this.storage.writeAllTables(data);
      console.log('Data persisted to IndexedDB');
    } catch (err) {
      console.error('Failed to persist to IndexedDB:', err);
    }
  }

  private createTables() {
    try {
      console.log('Creating tables if they do not exist...');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT,
          start_date TEXT,
          end_date TEXT,
          sprint_start_day INTEGER DEFAULT 1,
          sprint_duration_weeks INTEGER DEFAULT 2,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS columns (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          order_index INTEGER DEFAULT 0,
          is_deletable BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatar_color TEXT NOT NULL,
          initials TEXT NOT NULL,
          email TEXT,
          role TEXT,
          avatar_url TEXT
        );

        CREATE TABLE IF NOT EXISTS sprints (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          start_date TEXT,
          end_date TEXT,
          status TEXT DEFAULT 'planned',
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          column_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          sprint_id TEXT,
          assignee_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          tag TEXT,
          tag_variant TEXT,
          priority TEXT DEFAULT 'medium',
          progress INTEGER DEFAULT 0,
          due_date TEXT,
          completed BOOLEAN DEFAULT 0,
          is_archived BOOLEAN DEFAULT 0,
          order_index INTEGER DEFAULT 0,
          time_spent INTEGER DEFAULT 0,
          is_timer_running BOOLEAN DEFAULT 0,
          timer_started_at TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
          FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS project_users (
          project_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT DEFAULT 'member',
          PRIMARY KEY (project_id, user_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS subtasks (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          title TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0,
          order_index INTEGER DEFAULT 0,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          task_id TEXT,
          user_id TEXT,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      `);
      
      const projectCount = this.db.selectValue('SELECT count(*) FROM projects');
      console.log('Current project count:', projectCount);
      
      if (projectCount === 0) {
        console.log('No projects found, seeding initial data...');
        this.seed();
      }
    } catch (err) {
      console.error('Failed to create tables or seed data:', err);
      throw err;
    }
  }

  private seed() {
    try {
      const projectId = 'p1';
      console.log('Seeding project...');
      const startDate = new Date().toISOString().split('T')[0];
      this.db.exec({
        sql: 'INSERT INTO projects (id, name, description, color, start_date, sprint_start_day, sprint_duration_weeks) VALUES (?, ?, ?, ?, ?, ?, ?)',
        bind: [projectId, 'Alpha Project', 'Main development project', '#1152d4', startDate, 1, 2]
      });

      const users = [
        { id: 'u1', name: 'John Doe', color: '#3b82f6', initials: 'JD' },
        { id: 'u2', name: 'Jane Smith', color: '#10b981', initials: 'JS' },
        { id: 'u3', name: 'Mike Ross', color: '#f59e0b', initials: 'MR' }
      ];

      for (const u of users) {
        this.db.exec({
          sql: 'INSERT INTO users (id, name, avatar_color, initials) VALUES (?, ?, ?, ?)',
          bind: [u.id, u.name, u.color, u.initials]
        });
      }

      const columns = [
        { id: 'c1', name: 'To Do', order: 0, isDeletable: 0 },
        { id: 'c2', name: 'In Progress', order: 1, isDeletable: 0 },
        { id: 'c3', name: 'Review', order: 2, isDeletable: 0 },
        { id: 'c4', name: 'Done', order: 3, isDeletable: 0 }
      ];

      console.log('Seeding columns...');
      for (const col of columns) {
        this.db.exec({
          sql: 'INSERT INTO columns (id, project_id, name, order_index, is_deletable) VALUES (?, ?, ?, ?, ?)',
          bind: [col.id, projectId, col.name, col.order, col.isDeletable]
        });
      }

      const today = new Date();
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      const tasks = [
        { id: 't1', colId: 'c1', title: 'Implement Redis caching', tag: 'RESEARCH', variant: 'slate', dueDate: formatDate(new Date(today.getTime() + 86400000 * 2)) },
        { id: 't2', colId: 'c1', title: 'Update landing page design', tag: 'FRONTEND', variant: 'primary', progress: 45, dueDate: formatDate(new Date(today.getTime() + 86400000 * 5)) },
        { id: 't3', colId: 'c2', title: 'Auth flow refactoring', tag: 'CORE API', variant: 'primary', progress: 75, dueDate: formatDate(today) },
        { id: 't4', colId: 'c3', title: 'Migrate staging database', tag: 'INFRASTRUCTURE', variant: 'emerald', dueDate: formatDate(new Date(today.getTime() - 86400000 * 2)) },
        { id: 't5', colId: 'c4', title: 'Fix mobile navigation', tag: 'UI/UX', variant: 'emerald', completed: 1, dueDate: formatDate(new Date(today.getTime() - 86400000 * 5)) },
        { id: 't6', colId: 'c1', title: 'Prepare Q1 Report', tag: 'PLANNING', variant: 'amber', dueDate: formatDate(new Date(today.getTime() + 86400000 * 10)) },
        { id: 't7', colId: 'c2', title: 'API Documentation', tag: 'DOCS', variant: 'indigo', progress: 20, dueDate: formatDate(new Date(today.getTime() + 86400000 * 1)) }
      ];

      console.log('Seeding tasks...');
      for (const t of tasks) {
        this.db.exec({
          sql: 'INSERT INTO tasks (id, column_id, project_id, title, tag, tag_variant, progress, completed, is_archived, due_date, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          bind: [t.id, t.colId, projectId, t.title, t.tag, t.variant, t.progress || 0, t.completed || 0, 0, t.dueDate, users[0].id]
        });
      }
      console.log('Seeding complete');
    } catch (err) {
      console.error('Error during seeding:', err);
      throw err;
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      await this.init();
      if (!this.db) return [];
      
      const result: Project[] = [];
      this.db.exec({
        sql: 'SELECT * FROM projects ORDER BY created_at DESC',
        callback: (row: any[]) => {
          result.push({
            id: row[0],
            name: row[1],
            description: row[2],
            color: row[3],
            startDate: row[4] || row[8]?.split(' ')[0],
            endDate: row[5] || undefined,
            sprintStartDay: row[6],
            sprintDurationWeeks: row[7],
            createdAt: row[8]
          });
        }
      });
      return result;
    } catch (err) {
      console.error('Error in getProjects:', err);
      return [];
    }
  }

  async getProjectByName(name: string): Promise<Project | null> {
    await this.init();
    const projects = await this.getProjects();
    return projects.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === name.toLowerCase()) || null;
  }

  async addProject(project: Omit<Project, 'id' | 'createdAt'>) {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomUUID();
    const startDate = project.startDate || new Date().toISOString().split('T')[0];
    this.db.exec({
      sql: 'INSERT INTO projects (id, name, description, color, start_date, end_date, sprint_start_day, sprint_duration_weeks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      bind: [
        id, 
        project.name, 
        project.description || '', 
        project.color || '#3b82f6',
        startDate,
        project.endDate || null,
        project.sprintStartDay !== undefined ? project.sprintStartDay : 1,
        project.sprintDurationWeeks !== undefined ? project.sprintDurationWeeks : 2
      ]
    });

    // Add default columns
    const defaultColumns = [
      { name: 'To Do', order: 0 },
      { name: 'In Progress', order: 1000 },
      { name: 'Review', order: 2000 },
      { name: 'Done', order: 3000 }
    ];

    for (const col of defaultColumns) {
      this.db.exec({
        sql: 'INSERT INTO columns (id, project_id, name, order_index, is_deletable) VALUES (?, ?, ?, ?, ?)',
        bind: [crypto.randomUUID(), id, col.name, col.order, 0]
      });
    }

    await this.addActivity({
      projectId: id,
      type: 'project_created',
      content: `created project: ${project.name}`
    });

    this.schedulePersist();
    return id;
  }

  async deleteProject(projectId: string) {
    await this.init();
    this.db.exec({
      sql: 'DELETE FROM projects WHERE id = ?',
      bind: [projectId]
    });
    this.schedulePersist();
  }

  // Columns
  async getColumns(projectId: string): Promise<Column[]> {
    try {
      await this.init();
      if (!this.db) return [];

      const result: Column[] = [];
      this.db.exec({
        sql: 'SELECT * FROM columns WHERE project_id = ? ORDER BY order_index ASC',
        bind: [projectId],
        callback: (row: any[]) => {
          result.push({
            id: row[0],
            projectId: row[1],
            name: row[2],
            orderIndex: row[3],
            isDeletable: !!row[4]
          });
        }
      });
      return result;
    } catch (err) {
      console.error('Error in getColumns:', err);
      return [];
    }
  }

  async addColumn(column: Omit<Column, 'id'>) {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Get the current max order index to avoid collisions and allow gaps
    const maxOrder = this.db.selectValue('SELECT MAX(order_index) FROM columns WHERE project_id = ?', [column.projectId]) || 0;
    const nextOrder = (maxOrder as number) + 1000;

    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO columns (id, project_id, name, order_index) VALUES (?, ?, ?, ?)',
      bind: [id, column.projectId, column.name, nextOrder]
    });
    this.schedulePersist();
    return id;
  }

  // ... (rest of the file will be updated in another chunk if needed, but let's try to do as much as possible)

  async deleteColumn(columnId: string) {
    await this.init();
    this.db.exec({
      sql: 'DELETE FROM columns WHERE id = ?',
      bind: [columnId]
    });
    this.schedulePersist();
  }

  // Tasks
  async getTasks(projectId?: string, columnId?: string): Promise<Task[]> {
    try {
      await this.init();
      if (!this.db) return [];

      const result: Task[] = [];
      let sql = 'SELECT * FROM tasks';
      const binds: any[] = [];

      if (projectId && columnId) {
        sql += ' WHERE project_id = ? AND column_id = ?';
        binds.push(projectId, columnId);
      } else if (projectId) {
        sql += ' WHERE project_id = ?';
        binds.push(projectId);
      } else if (columnId) {
        sql += ' WHERE column_id = ?';
        binds.push(columnId);
      }

      sql += ' ORDER BY order_index ASC, created_at DESC';
      
      this.db.exec({
        sql,
        bind: binds,
        callback: (row: any[]) => {
          result.push({
            id: row[0],
            columnId: row[1],
            projectId: row[2],
            sprintId: row[3] || undefined,
            assigneeId: row[4] || undefined,
            title: row[5],
            description: row[6],
            tag: row[7],
            tagVariant: row[8],
            priority: (row[9] || 'medium') as Priority,
            progress: row[10] || 0,
            dueDate: row[11] || undefined,
            completed: !!row[12],
            isArchived: !!row[13],
            orderIndex: row[14],
            timeSpent: row[15] || 0,
            isTimerRunning: !!row[16],
            timerStartedAt: row[16] || undefined,
            createdAt: row[17],
            updatedAt: row[18]
            });
        }
      });
      return result;
    } catch (err) {
      console.error('Error in getTasks:', err);
      return [];
    }
  }

  // Project Teams
  async getProjectTeam(projectId: string): Promise<User[]> {
    await this.init();
    const result: User[] = [];
    this.db.exec({
      sql: `
        SELECT u.* FROM users u
        JOIN project_users pu ON u.id = pu.user_id
        WHERE pu.project_id = ?
      `,
      bind: [projectId],
      callback: (row: any[]) => {
        result.push({
          id: row[0],
          name: row[1],
          avatarColor: row[2],
          initials: row[3],
          email: row[4] || undefined,
          role: row[5] || undefined
        });
      }
    });
    return result;
  }

  async addUserToProject(projectId: string, userId: string, role: string = 'member') {
    await this.init();
    this.db.exec({
      sql: 'INSERT OR REPLACE INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)',
      bind: [projectId, userId, role]
    });
    this.schedulePersist();
  }

  async removeUserFromProject(projectId: string, userId: string) {
    await this.init();
    this.db.exec({
      sql: 'DELETE FROM project_users WHERE project_id = ? AND user_id = ?',
      bind: [projectId, userId]
    });
    this.schedulePersist();
  }

  // Timer Logic
  async startTaskTimer(taskId: string) {
    await this.init();
    const now = new Date().toISOString();
    this.db.exec({
      sql: 'UPDATE tasks SET is_timer_running = 1, timer_started_at = ? WHERE id = ?',
      bind: [now, taskId]
    });
    this.schedulePersist();
  }

  async stopTaskTimer(taskId: string) {
    await this.init();
    const task = (await this.getTasks()).find(t => t.id === taskId);
    if (!task || !task.isTimerRunning || !task.timerStartedAt) return;

    const startTime = new Date(task.timerStartedAt).getTime();
    const now = new Date().getTime();
    const diffSeconds = Math.floor((now - startTime) / 1000);
    const newTotalSeconds = (task.timeSpent || 0) + diffSeconds;

    this.db.exec({
      sql: 'UPDATE tasks SET is_timer_running = 0, timer_started_at = NULL, time_spent = ? WHERE id = ?',
      bind: [newTotalSeconds, taskId]
    });
    this.schedulePersist();
  }

  async updateTaskColumn(taskId: string, columnId: string) {
    await this.init();
    this.db.exec({
      sql: 'UPDATE tasks SET column_id = ? WHERE id = ?',
      bind: [columnId, taskId]
    });
    this.schedulePersist();
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt'>) {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const maxOrder = this.db.selectValue('SELECT MAX(order_index) FROM tasks WHERE column_id = ?', [task.columnId]) || 0;
    const nextOrder = (maxOrder as number) + 1000;

    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO tasks (id, column_id, project_id, sprint_id, assignee_id, title, description, tag, tag_variant, priority, progress, due_date, completed, is_archived, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      bind: [
        id, 
        task.columnId, 
        task.projectId, 
        task.sprintId || null,
        task.assigneeId || null,
        task.title, 
        task.description || '', 
        task.tag || '', 
        task.tagVariant || 'primary', 
        task.priority || 'medium',
        task.progress || 0, 
        task.dueDate || '', 
        task.completed ? 1 : 0, 
        task.isArchived ? 1 : 0,
        nextOrder
      ]
    });
    
    await this.addActivity({
      projectId: task.projectId,
      taskId: id,
      type: 'task_created',
      content: `created task: ${task.title}`
    });

    this.schedulePersist();
    return id;
  }

  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    await this.init();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(f => {
      const snake = f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      return `${snake} = ?`;
    }).join(', ');

    const values = fields.map(f => {
      const val = (updates as any)[f];
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });

    this.db.exec({
      sql: `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      bind: [...values, taskId]
    });

    // Log activity if title changed
    if (updates.title || updates.completed !== undefined) {
      const task = (await this.getTasks()).find(t => t.id === taskId);
      if (task) {
        await this.addActivity({
          projectId: task.projectId,
          taskId: taskId,
          type: 'task_updated',
          content: updates.completed !== undefined 
            ? `${updates.completed ? 'completed' : 'reopened'} task: ${task.title}`
            : `updated task: ${task.title}`
        });
      }
    }
    this.schedulePersist();
  }

  async deleteTask(taskId: string) {
    await this.init();
    this.db.exec({
      sql: 'DELETE FROM tasks WHERE id = ?',
      bind: [taskId]
    });
    this.schedulePersist();
  }

  // Subtasks
  async getSubtasks(taskId: string): Promise<Subtask[]> {
    await this.init();
    const result: Subtask[] = [];
    this.db.exec({
      sql: 'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC',
      bind: [taskId],
      callback: (row: any[]) => {
        result.push({
          id: row[0],
          taskId: row[1],
          title: row[2],
          completed: !!row[3],
          orderIndex: row[4]
        });
      }
    });
    return result;
  }

  async addSubtask(subtask: Omit<Subtask, 'id'>) {
    await this.init();
    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO subtasks (id, task_id, title, completed, order_index) VALUES (?, ?, ?, ?, ?)',
      bind: [id, subtask.taskId, subtask.title, subtask.completed ? 1 : 0, subtask.orderIndex || 0]
    });
    return id;
  }

  async updateSubtask(id: string, updates: Partial<Omit<Subtask, 'id' | 'taskId'>>) {
    await this.init();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;
    const setClause = fields.map(f => `${f.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f] === true ? 1 : (updates as any)[f] === false ? 0 : (updates as any)[f]);
    this.db.exec({
      sql: `UPDATE subtasks SET ${setClause} WHERE id = ?`,
      bind: [...values, id]
    });
  }

  async deleteSubtask(id: string) {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM subtasks WHERE id = ?', bind: [id] });
  }

  // Users
  async getUsers(): Promise<User[]> {
    await this.init();
    const result: User[] = [];
    this.db.exec({
      sql: 'SELECT * FROM users',
      callback: (row: any[]) => {
        result.push({
          id: row[0],
          name: row[1],
          avatarColor: row[2],
          initials: row[3],
          email: row[4] || undefined,
          role: row[5] || undefined,
          avatarUrl: row[6] || undefined
        });
      }
    });
    return result;
  }

  async addUser(user: Omit<User, 'id'>) {
    await this.init();
    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO users (id, name, avatar_color, initials, email, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      bind: [id, user.name, user.avatarColor, user.initials, user.email || null, user.role || null, user.avatarUrl || null]
    });
    return id;
  }

  async deleteUser(id: string) {
    await this.init();
    this.db.exec({ sql: 'DELETE FROM users WHERE id = ?', bind: [id] });
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>) {
    await this.init();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;
    const setClause = fields.map(f => {
      const snake = f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      return `${snake} = ?`;
    }).join(', ');
    const values = fields.map(f => (updates as any)[f]);
    this.db.exec({
      sql: `UPDATE users SET ${setClause} WHERE id = ?`,
      bind: [...values, id]
    });
  }

  // Comments
  async getComments(taskId: string): Promise<Comment[]> {
    await this.init();
    const result: Comment[] = [];
    this.db.exec({
      sql: 'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC',
      bind: [taskId],
      callback: (row: any[]) => {
        result.push({
          id: row[0],
          taskId: row[1],
          userId: row[2],
          content: row[3],
          createdAt: row[4]
        });
      }
    });
    return result;
  }

  async addComment(comment: Omit<Comment, 'id' | 'createdAt'>) {
    await this.init();
    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)',
      bind: [id, comment.taskId, comment.userId, comment.content]
    });
    return id;
  }

  // Activities
  async getActivities(projectId: string): Promise<Activity[]> {
    await this.init();
    const result: Activity[] = [];
    this.db.exec({
      sql: 'SELECT * FROM activities WHERE project_id = ? ORDER BY created_at DESC',
      bind: [projectId],
      callback: (row: any[]) => {
        result.push({
          id: row[0],
          projectId: row[1],
          taskId: row[2] || undefined,
          userId: row[3] || undefined,
          type: row[4],
          content: row[5],
          createdAt: row[6]
        });
      }
    });
    return result;
  }

  async addActivity(activity: Omit<Activity, 'id' | 'createdAt'>) {
    await this.init();
    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO activities (id, project_id, task_id, user_id, type, content) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [id, activity.projectId, activity.taskId || null, activity.userId || null, activity.type, activity.content]
    });
    return id;
  }

  // Sprints
  async getSprints(projectId: string): Promise<Sprint[]> {
    await this.init();
    const result: Sprint[] = [];
    this.db.exec({
      sql: 'SELECT * FROM sprints WHERE project_id = ?',
      bind: [projectId],
      callback: (row: any[]) => {
        result.push({
          id: row[0],
          projectId: row[1],
          name: row[2],
          startDate: row[3],
          endDate: row[4],
          status: row[5] as any
        });
      }
    });
    return result;
  }

  async addSprint(sprint: Omit<Sprint, 'id'>) {
    await this.init();
    const id = crypto.randomUUID();
    this.db.exec({
      sql: 'INSERT INTO sprints (id, project_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [id, sprint.projectId, sprint.name, sprint.startDate, sprint.endDate, sprint.status]
    });
    return id;
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) {
    await this.init();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;
    const setClause = fields.map(f => {
      const snake = f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      return `${snake} = ?`;
    }).join(', ');
    const values = fields.map(f => (updates as any)[f]);
    this.db.exec({
      sql: `UPDATE projects SET ${setClause} WHERE id = ?`,
      bind: [...values, id]
    });
    this.schedulePersist();
  }
}

export const db = new DatabaseService();
