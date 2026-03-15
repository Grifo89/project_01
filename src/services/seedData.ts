import { Project, Column, Task, Priority } from './db';

export const SEED_PROJECTS: Omit<Project, 'id' | 'createdAt'>[] = [
  {
    name: 'Apollo Platform',
    description: 'Next-generation project management suite with integrated AI capabilities and real-time collaboration.',
    color: '#1152d4',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getTime() + 86400000 * 120).toISOString().split('T')[0],
    sprintStartDay: 1,
    sprintDurationWeeks: 2
  }
];

export const SEED_COLUMNS = [
  { name: 'To Do', order: 1000, isDeletable: false },
  { name: 'In Progress', order: 2000, isDeletable: false },
  { name: 'Review', order: 3000, isDeletable: false },
  { name: 'Done', order: 4000, isDeletable: false }
];

const today = new Date();
const formatDate = (daysFromNow: number) => {
  const d = new Date(today.getTime() + 86400000 * daysFromNow);
  return d.toISOString().split('T')[0];
};

export const SEED_TASKS = [
  // --- DONE COLUMN ---
  {
    title: 'Brand Identity & Guidelines',
    description: 'Create the primary color palette, typography, and logo variations.',
    tag: 'DESIGN', tagVariant: 'indigo', priority: 'high' as Priority,
    progress: 100, completed: true, columnName: 'Done',
    dueDate: formatDate(-10),
  },
  {
    title: 'Core Database Schema',
    description: 'Design and implement the initial SQLite schema for projects and tasks.',
    tag: 'CORE', tagVariant: 'primary', priority: 'high' as Priority,
    progress: 100, completed: true, columnName: 'Done',
    dueDate: formatDate(-5),
  },

  // --- REVIEW COLUMN ---
  {
    title: 'Authentication Flow UI',
    description: 'Review the login and signup screens for consistency with the new brand guidelines.',
    tag: 'UI', tagVariant: 'slate', priority: 'medium' as Priority,
    progress: 90, completed: false, columnName: 'Review',
    dueDate: formatDate(-1),
  },

  // --- IN PROGRESS COLUMN ---
  {
    title: 'SQLite WASM Persistence',
    description: 'Implementing OPFS storage and IndexedDB backup layer.',
    tag: 'CORE', tagVariant: 'primary', priority: 'high' as Priority,
    progress: 65, completed: false, columnName: 'In Progress',
    dueDate: formatDate(2),
  },
  {
    title: 'Responsive Dashboard Charts',
    description: 'Developing the efficiency and progress charts using SVG and Framer Motion.',
    tag: 'FRONTEND', tagVariant: 'emerald', priority: 'medium' as Priority,
    progress: 45, completed: false, columnName: 'In Progress',
    dueDate: formatDate(4),
  },

  // --- TO DO COLUMN ---
  {
    title: 'Multiple Assignee Support',
    description: 'Enable tasks to have more than one team member assigned simultaneously.',
    tag: 'FEATURE', tagVariant: 'primary', priority: 'high' as Priority,
    progress: 0, completed: false, columnName: 'To Do',
    dueDate: formatDate(7),
  },
  {
    title: 'Project Switching Logic',
    description: 'Add the ability to switch between different projects in the sidebar and mobile view.',
    tag: 'UX', tagVariant: 'amber', priority: 'medium' as Priority,
    progress: 0, completed: false, columnName: 'To Do',
    dueDate: formatDate(10),
  },
  {
    title: 'AI Subtask Generation',
    description: 'Integrate Gemini API to automatically break down large tasks into smaller subtasks.',
    tag: 'AI', tagVariant: 'indigo', priority: 'medium' as Priority,
    progress: 0, completed: false, columnName: 'To Do',
    dueDate: formatDate(15),
  },
  {
    title: 'Performance Optimization',
    description: 'Analyze and improve the rendering performance of the Kanban board with large datasets.',
    tag: 'CORE', tagVariant: 'slate', priority: 'low' as Priority,
    progress: 0, completed: false, columnName: 'To Do',
    dueDate: formatDate(20),
  }
];
