/**
 * scripts/seed.ts
 *
 * Generates public/seed.json — a plain JSON file containing pre-built seed rows
 * for every table in the Project Tracker Pro schema.
 *
 * Run with:  npm run seed
 *
 * The browser's db.init() checks for /seed.json on first boot (empty IndexedDB)
 * and hydrates the SQLite database from it, giving you deterministic dev data
 * without requiring a separate server or build step.
 *
 * This script uses Node.js only — no SQLite WASM, no browser APIs.
 * The data shapes must match the column order expected by db.ts createTables().
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateId = () => randomUUID();

const today = new Date();
const formatDate = (daysFromNow: number) => {
  const d = new Date(today.getTime() + 86400000 * daysFromNow);
  return d.toISOString().split('T')[0];
};

// ---------------------------------------------------------------------------
// Seed data (mirrors src/services/seedData.ts, Node-compatible)
// ---------------------------------------------------------------------------

const SEED_PROJECTS = [
  {
    name: 'Apollo Platform',
    description: 'Next-generation project management suite with integrated AI capabilities and real-time collaboration.',
    color: '#1152d4',
    startDate: formatDate(0),
    endDate: formatDate(120),
    sprintStartDay: 1,
    sprintDurationWeeks: 2,
  },
];

const SEED_COLUMNS = [
  { name: 'To Do',      orderIndex: 1000, isDeletable: false },
  { name: 'In Progress',orderIndex: 2000, isDeletable: false },
  { name: 'Review',     orderIndex: 3000, isDeletable: false },
  { name: 'Done',       orderIndex: 4000, isDeletable: false },
];

const SEED_TASKS = [
  // --- DONE ---
  {
    title: 'Brand Identity & Guidelines',
    description: 'Create the primary color palette, typography, and logo variations.',
    tag: 'DESIGN', tagVariant: 'indigo', priority: 'high',
    progress: 100, completed: true, columnName: 'Done', dueDate: formatDate(-10),
  },
  {
    title: 'Core Database Schema',
    description: 'Design and implement the initial SQLite schema for projects and tasks.',
    tag: 'CORE', tagVariant: 'primary', priority: 'high',
    progress: 100, completed: true, columnName: 'Done', dueDate: formatDate(-5),
  },
  // --- REVIEW ---
  {
    title: 'Authentication Flow UI',
    description: 'Review the login and signup screens for consistency with the new brand guidelines.',
    tag: 'UI', tagVariant: 'slate', priority: 'medium',
    progress: 90, completed: false, columnName: 'Review', dueDate: formatDate(-1),
  },
  // --- IN PROGRESS ---
  {
    title: 'SQLite WASM Persistence',
    description: 'Implementing OPFS storage and IndexedDB backup layer.',
    tag: 'CORE', tagVariant: 'primary', priority: 'high',
    progress: 65, completed: false, columnName: 'In Progress', dueDate: formatDate(2),
  },
  {
    title: 'Responsive Dashboard Charts',
    description: 'Developing the efficiency and progress charts using SVG and Framer Motion.',
    tag: 'FRONTEND', tagVariant: 'emerald', priority: 'medium',
    progress: 45, completed: false, columnName: 'In Progress', dueDate: formatDate(4),
  },
  // --- TO DO ---
  {
    title: 'Multiple Assignee Support',
    description: 'Enable tasks to have more than one team member assigned simultaneously.',
    tag: 'FEATURE', tagVariant: 'primary', priority: 'high',
    progress: 0, completed: false, columnName: 'To Do', dueDate: formatDate(7),
  },
  {
    title: 'Project Switching Logic',
    description: 'Add the ability to switch between different projects in the sidebar and mobile view.',
    tag: 'UX', tagVariant: 'amber', priority: 'medium',
    progress: 0, completed: false, columnName: 'To Do', dueDate: formatDate(10),
  },
  {
    title: 'AI Subtask Generation',
    description: 'Integrate Gemini API to automatically break down large tasks into smaller subtasks.',
    tag: 'AI', tagVariant: 'indigo', priority: 'medium',
    progress: 0, completed: false, columnName: 'To Do', dueDate: formatDate(15),
  },
  {
    title: 'Performance Optimization',
    description: 'Analyze and improve the rendering performance of the Kanban board with large datasets.',
    tag: 'CORE', tagVariant: 'slate', priority: 'low',
    progress: 0, completed: false, columnName: 'To Do', dueDate: formatDate(20),
  },
];

// ---------------------------------------------------------------------------
// Build the seed payload
// ---------------------------------------------------------------------------

interface SeedProject {
  id: string;
  name: string;
  description: string;
  color: string;
  start_date: string;
  end_date: string;
  sprint_start_day: number;
  sprint_duration_weeks: number;
  created_at: string;
}

interface SeedColumn {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  is_deletable: number;
  created_at: string;
}

interface SeedTask {
  id: string;
  column_id: string;
  project_id: string;
  sprint_id: null;
  assignee_ids: string;
  title: string;
  description: string;
  tag: string;
  tag_variant: string;
  priority: string;
  progress: number;
  due_date: string;
  completed: number;
  is_archived: number;
  order_index: number;
  time_spent: number;
  is_timer_running: number;
  timer_started_at: null;
  created_at: string;
  updated_at: string;
}

interface SeedPayload {
  generated_at: string;
  tables: {
    projects: SeedProject[];
    columns: SeedColumn[];
    project_members: never[];
    sprints: never[];
    tasks: SeedTask[];
    subtasks: never[];
    comments: never[];
    activities: never[];
  };
}

const now = new Date().toISOString();

const projects: SeedProject[] = [];
const columns: SeedColumn[] = [];
const tasks: SeedTask[] = [];

for (const p of SEED_PROJECTS) {
  const pid = generateId();

  projects.push({
    id: pid,
    name: p.name,
    description: p.description,
    color: p.color,
    start_date: p.startDate,
    end_date: p.endDate,
    sprint_start_day: p.sprintStartDay,
    sprint_duration_weeks: p.sprintDurationWeeks,
    created_at: now,
  });

  // Build column map for this project
  const colMap: Record<string, string> = {};
  for (const c of SEED_COLUMNS) {
    const cid = generateId();
    colMap[c.name] = cid;
    columns.push({
      id: cid,
      project_id: pid,
      name: c.name,
      order_index: c.orderIndex,
      is_deletable: c.isDeletable ? 1 : 0,
      created_at: now,
    });
  }

  // Build tasks for this project
  SEED_TASKS.forEach((t, i) => {
    const cid = colMap[t.columnName];
    if (!cid) {
      console.warn(`⚠️  Unknown columnName "${t.columnName}" for task "${t.title}" — skipping`);
      return;
    }
    tasks.push({
      id: generateId(),
      column_id: cid,
      project_id: pid,
      sprint_id: null,
      assignee_ids: '',
      title: t.title,
      description: t.description,
      tag: t.tag,
      tag_variant: t.tagVariant,
      priority: t.priority,
      progress: t.progress,
      due_date: t.dueDate,
      completed: t.completed ? 1 : 0,
      is_archived: 0,
      order_index: i * 10,
      time_spent: 0,
      is_timer_running: 0,
      timer_started_at: null,
      created_at: now,
      updated_at: now,
    });
  });
}

const payload: SeedPayload = {
  generated_at: now,
  tables: {
    projects,
    columns,
    project_members: [],
    sprints: [],
    tasks,
    subtasks: [],
    comments: [],
    activities: [],
  },
};

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const outputDir = join(process.cwd(), 'public');
const outputPath = join(outputDir, 'seed.json');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

const projectCount = projects.length;
const columnCount = columns.length;
const taskCount = tasks.length;

console.log('✅ Seed data written to public/seed.json');
console.log(`   Projects : ${projectCount}`);
console.log(`   Columns  : ${columnCount}`);
console.log(`   Tasks    : ${taskCount}`);
console.log('');
console.log('The browser will load this file on first boot (empty IndexedDB).');
console.log('To force a reseed in the browser, clear IndexedDB and reload.');
