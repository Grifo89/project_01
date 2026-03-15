# Project Tracker Pro — Development Roadmap

> Derived from `AUDIT.md` · March 2026  
> Tasks are ordered by priority within each phase. Check off items as they are completed.

---

## Legend

| Badge | Meaning |
|---|---|
| 🔴 | Ship-blocker — app is broken without this |
| 🟠 | High value — core promise of the product |
| 🟡 | Quality of life — improves reliability & maintainability |
| 🟢 | Feature expansion — new capabilities |
| ⚡ | Quick win — under 30 minutes |

---

## Phase 0 — Stop the Bleeding
> **Goal:** Make every existing view functional with no runtime crashes.  
> **Target:** Before any public or team demo.

### 🔴 DB Layer — Implement 7 Missing Methods in `db.ts`

These are called from 4 views but don't exist. Every one of them throws at runtime today.

- [ ] `db.addUser(user)` — used by `ProfileSettingsView`, `ProjectSettingsView`, `TeamView`
- [ ] `db.updateUser(id, fields)` — used by `ProfileSettingsView`
- [ ] `db.deleteUser(id)` — used by `ProjectSettingsView`
- [ ] `db.addUserToProject(projectId, userId, role?)` — used by `ProjectSettingsView`, `TeamView`
- [ ] `db.removeUserFromProject(projectId, userId)` — used by `ProjectSettingsView`, `TeamView`
- [ ] `db.getSprints(projectId)` — used by `SprintView`
- [ ] `db.addSprint(sprint)` — used by `SprintView`
- [ ] Export `interface Sprint { id, projectId, name, startDate, endDate, status }` from `db.ts`

### 🔴 Bug Fixes — Broken View Logic

- [ ] **`CalendarView`** — Fix `addTask` call: rename `assigneeId` → `assigneeIds: [myUserId]` (array, not string)
- [ ] **`CalendarView`** — Fix broken loading state: the `if (loading) { // ... }` stub has no `return`, so the spinner never shows
- [ ] **`BoardView`** — Wire `onDelete` handler from `TaskCard` context menu through `SortableTaskCard` to `db.deleteTask()`
- [ ] **`BoardView`** — Wire `onArchive` handler from `TaskCard` context menu to `db.updateTask(id, { isArchived: true })`
- [ ] **`DashboardView`** — Fix broken navigation: `route('/project/${currentProject.id}/board')` → use slugified name, not raw ID

### 🔴 Data Safety — Fix the Async Persistence Race Condition

- [ ] Replace `beforeunload` async `persist()` call with a `visibilitychange` listener (`document.visibilityState === 'hidden'`)
- [ ] Keep `beforeunload` as a secondary fallback (synchronous dirty-flag check)
- [ ] Add a `isDirty` flag to `DatabaseService` that is set on every write and cleared after a successful `persist()`
- [ ] Add a visible "Saving…" / "All changes saved" indicator in the `Navbar` so users know when writes are flushed

### 🔴 PWA — Fix Offline Install Failure

- [ ] Download both icon images and save as `public/icons/icon-192.png` and `public/icons/icon-512.png`
- [ ] Update `public/manifest.json` icon `src` fields to use local paths (`/icons/icon-192.png`, `/icons/icon-512.png`)

### ⚡ Quick Wins — Fix in One Sitting

- [ ] Remove duplicate `vite` entry from `dependencies` in `package.json` (keep only in `devDependencies`)
- [ ] Add missing `import { useState, useEffect } from 'preact/hooks'` to `SprintView`
- [ ] Add missing `import { useState, useEffect } from 'preact/hooks'` to `TeamView`
- [ ] Add `localStorage.setItem('hasSeenLanding', 'true')` to `seeder.ts` so returning users don't re-see the landing page after a refresh
- [ ] Add `<meta name="apple-mobile-web-app-title" content="TrackerPro" />` to `index.html` for correct iOS PWA label

---

## Phase 1 — Core Product Promises
> **Goal:** Deliver on the "local-first, data ownership" positioning and fix the biggest daily-use pain points.  
> **Target:** End of Sprint 1 after Phase 0.

### 🟠 Data Export & Backup — Respect the User's Ownership of Their Data

- [ ] Add an **Export to JSON** button in `ProjectSettingsView` that downloads all tasks, columns, users, comments, and subtasks for the current project as a single `.json` file
- [ ] Add a **Download SQLite Backup** button in `ProjectSettingsView` that exports the entire raw `.db` file from IndexedDB as a downloadable blob
- [ ] Add an **Import from Backup** flow in `ProjectSettingsView` that accepts a `.json` or `.db` file and restores it
- [ ] Show a data-age warning in `ProfileSettingsView`: "Last backup: X days ago" to nudge users toward exporting

### 🟠 Auth Context — Eliminate Scattered `localStorage` Reads

- [ ] Create `src/context/UserContext.tsx` exporting a `UserProvider` and `useCurrentUser()` hook
- [ ] Initialize the context once in `App.tsx` after `db.init()` resolves
- [ ] Replace all `localStorage.getItem('myUserId')` calls in: `db.ts`, `seeder.ts`, `TaskForm.tsx`, `TaskDetailModal.tsx`, `BoardView.tsx`, `CalendarView.tsx`, `BacklogView.tsx` with `useCurrentUser().id`
- [ ] Ensure the fallback (`'me'`) is only ever set in `main.tsx` during initial bootstrap — never scattered across components

### 🟠 Error Boundaries — Prevent Full App Crashes

- [ ] Create `src/components/ErrorBoundary.tsx` as a Preact class component with a friendly fallback UI ("Something went wrong in this view — tap to retry")
- [ ] Wrap `BoardView` in an `<ErrorBoundary>`
- [ ] Wrap `SprintView` in an `<ErrorBoundary>`
- [ ] Wrap `TeamView` in an `<ErrorBoundary>`
- [ ] Wrap `ProjectSettingsView` in an `<ErrorBoundary>`
- [ ] Wrap `TaskDetailModal` in an `<ErrorBoundary>`
- [ ] Add global `window.onerror` and `window.onunhandledrejection` listeners that log errors and show a non-intrusive toast

### 🟠 Mobile Search — Search is Inaccessible on Phones

- [ ] Add a search icon button to `BottomNav` (replacing or alongside the existing tab icons)
- [ ] Build a `SearchOverlay` full-screen modal component that activates when the icon is tapped
- [ ] Wire `SearchOverlay` to the same `searchQuery` state prop already used by `BoardView`
- [ ] Make the `Navbar` search bar visible on mobile (`sm:block` → always visible, or collapsible)

### 🟠 Activity Feed — The Feed is Always Empty After Seed

- [ ] Write an `addActivity()` call in `db.addTask()` — "created task X"
- [ ] Write an `addActivity()` call in `db.updateTask()` — "updated task X"
- [ ] Write an `addActivity()` call in `db.deleteTask()` — "deleted task X"
- [ ] Write an `addActivity()` call in `db.addComment()` — "commented on task X"
- [ ] Write an `addActivity()` call in `db.startTaskTimer()` / `stopTaskTimer()` — "tracked N minutes on task X"
- [ ] Paginate the activity feed in `DashboardView` (currently slices to 5 — add a "Load more" button)

---

## Phase 2 — Quality & Reliability
> **Goal:** Make the codebase robust enough to extend safely. Fix the architecture issues that will otherwise compound.  
> **Target:** Sprint 2.

### 🟡 Persistence — Harden the Schema Migration Story

- [ ] Add a `schema_version` key to the IndexedDB store (start at `1`)
- [ ] Write a `migrateSchema(fromVersion, db)` function in `db.ts` that handles column additions gracefully
- [ ] Increment `schema_version` on every table change and add a corresponding migration step
- [ ] Add a `runSql(sql, bind)` wrapper around `db.exec()` that catches and logs errors in development mode instead of silently no-oping

### 🟡 Routing — Single Source of Truth

- [ ] Remove `currentProjectId` from `App.tsx` state
- [ ] Derive `currentProject` using `useMemo` that parses `window.location.pathname` and matches against the `projects` array
- [ ] Remove the `handleRouteChange` `popstate` listener from `App.tsx` (no longer needed)
- [ ] Audit all `route()` calls across the app — ensure all use slugified project names, never raw IDs

### 🟡 Type Safety — Eliminate `any` in DB Row Callbacks

- [ ] Define typed row tuple types for each table (e.g. `type TaskRow = [string, string, string, ...]`)
- [ ] Replace all `callback: (r: any[]) => ...` in `db.ts` with typed row destructuring
- [ ] Enable `"strict": true` in `tsconfig.json` and fix resulting type errors
- [ ] Run `npm run lint` (currently `tsc --noEmit`) in CI to catch regressions

### 🟡 Performance — Optimistic Updates in `BoardView`

- [ ] On drag-end, immediately update local `tasks` state (move task to new column) without waiting for `fetchData()`
- [ ] Call `db.updateTaskColumn()` in the background after the optimistic update
- [ ] On error, revert the local state and show a toast notification
- [ ] Apply the same pattern to task creation: append the new task to local state before the DB write resolves

### 🟡 PWA — Proper Asset Pre-caching

- [ ] Decide: either configure `vite-plugin-pwa` properly OR remove it from `package.json`
- [ ] **If using `vite-plugin-pwa`:** Add it to `vite.config.ts`, configure `workbox.globPatterns` to include `**/*.{js,css,html,wasm}`, and delete the hand-rolled `public/sw.js`
- [ ] **If keeping hand-rolled SW:** Add a build script that injects the Vite-generated asset manifest into `sw.js` at build time, and replace the hardcoded `CACHE_NAME = 'project-tracker-v2'` with an auto-generated hash
- [ ] Test the offline experience end-to-end: load the app, go offline, hard-reload — the full UI should load from cache

### 🟡 Performance — SQLite WASM Cold Start

- [ ] Build a proper **splash screen** component with animated logo and step-by-step progress text ("Loading database…", "Restoring your data…", "Ready")
- [ ] Move SQLite WASM initialization into a **Web Worker** so the main thread stays responsive during the 300–800ms init window
- [ ] Pre-warm the WASM module during the `LoginView` / `LandingView` render so it's ready before the user enters the app

### 🟡 Code Organization — Decompose `TaskDetailModal`

- [ ] Extract `<TaskHeader />` (title, status badge, priority pill, complete button)
- [ ] Extract `<SubtaskList />` (subtask CRUD, linked progress logic)
- [ ] Extract `<CommentThread />` (comment list + add comment)
- [ ] Extract `<AssigneePanel />` (assignee pills + add/remove modal)
- [ ] Extract `<TimeTracker />` (elapsed display + start/stop button)
- [ ] Extract `<TaskMetaPanel />` (due date, priority editor, progress bar sidebar)
- [ ] Keep `TaskDetailModal` as a thin layout shell that composes the above

### 🟡 Code Organization — Split `db.ts` into Domain Repositories

- [ ] Create `src/services/repos/` directory
- [ ] Extract project methods → `repos/projectRepo.ts`
- [ ] Extract task methods → `repos/taskRepo.ts`
- [ ] Extract user methods → `repos/userRepo.ts`
- [ ] Extract sprint methods → `repos/sprintRepo.ts`
- [ ] Extract comment/subtask/activity methods → `repos/activityRepo.ts`
- [ ] Keep `db.ts` as the entry point that re-exports a composed `db` object from all repos

### 🟡 Input Validation — Prevent Runaway Data

- [ ] Add `maxLength={200}` to all task title inputs
- [ ] Add `maxLength={2000}` to all description textareas
- [ ] Add `maxLength={500}` to all comment inputs
- [ ] Add `maxLength={100}` to project name inputs
- [ ] Add service-layer validation in `db.addTask()` and `db.updateTask()` that trims strings and rejects values exceeding limits

### 🟡 Security — Document the API Key Situation

- [ ] Update `.env.example` with a prominent comment: `# WARNING: This key will be inlined into the browser bundle. Only use a key scoped to your personal account.`
- [ ] Add a note in `README.md` explaining the local-first security model and that the Gemini key is user-supplied
- [ ] Investigate using a local proxy (Express server already in the project) to keep the key server-side

---

## Phase 3 — Feature Expansion
> **Goal:** Build out the roadmap features that differentiate the product.  
> **Target:** After Phases 0–2 are stable.

### 🟢 Dashboard — Replace Mock Chart with Real Data

- [ ] Replace the decorative SVG wave in `DashboardView` with a real **task completion over time** line chart using the `activities` table
- [ ] Add a **task distribution by priority** donut chart (data already available from `tasks`)
- [ ] Add a **per-member workload** bar chart (tasks assigned per user)
- [ ] Add a proper empty state with illustration for when all tasks are done ("You're all caught up! 🎉")

### 🟢 Sprint Burndown Chart

- [ ] Add a `SprintDetailView` that shows the individual sprint's tasks in a filtered Kanban view
- [ ] Implement a **burndown chart**: remaining tasks over sprint days (requires logging a daily snapshot — consider a scheduled `activity` write via `setInterval`)
- [ ] Add sprint velocity tracking: compare estimated vs actual completion across past sprints

### 🟢 AI Planning Coach (Gemini Integration)

- [ ] Add a floating "AI Assist" button to `TaskDetailModal`
- [ ] On click, send the task title + description to Gemini and stream back suggested subtasks
- [ ] Add a "Generate Sprint Plan" button in `SprintView` that sends the backlog to Gemini and suggests which tasks to pull into the sprint based on priority and due date
- [ ] Add a "Daily Standup Summary" action in `DashboardView` that summarizes yesterday's completed tasks and today's in-progress tasks as a readable paragraph
- [ ] Use the Express server (`express` is already a dependency) as a local proxy to keep the Gemini API key off the client bundle

### 🟢 Encrypted Cloud Backup ("Zync")

- [ ] Design the Zync settings UI in `ProfileSettingsView`: endpoint URL, bucket/path, access key inputs
- [ ] Implement WebCrypto AES-GCM encryption of the SQLite export blob before upload
- [ ] Implement upload to any S3-compatible endpoint (user-supplied credentials, never stored server-side)
- [ ] Implement download + decrypt + restore flow
- [ ] Add a background sync indicator in the `Navbar` showing last cloud sync time

### 🟢 Task Dependencies

- [ ] Add `blocks TEXT` and `blocked_by TEXT` columns to the `tasks` table (comma-separated task IDs)
- [ ] Add a migration step for existing data
- [ ] Add a "Dependencies" section in `TaskDetailModal` with an add/remove dependency UI
- [ ] Show a blocked indicator (lock icon) on task cards in `BoardView` when a task's blockers are not yet complete
- [ ] Prevent moving a blocked task to "Done" until all its blockers are resolved

### 🟢 Recurring Tasks

- [ ] Add `recurrence_rule TEXT` column to `tasks` table (e.g. `DAILY`, `WEEKLY:MON`, `MONTHLY:1`)
- [ ] Add a recurrence picker UI in `TaskForm` and `TaskDetailModal`
- [ ] Implement a scheduler that runs on app startup and creates new task instances for overdue recurring tasks
- [ ] Show a recurrence badge (↻) on task cards that have an active rule

### 🟢 Accessibility — Full Keyboard Navigation on Kanban

- [ ] Add visible focus rings to all interactive elements in `BoardView` (currently suppressed by `outline-none`)
- [ ] Implement keyboard shortcuts: `N` = new task in focused column, `Enter` = open task detail, `Delete` = delete selected task
- [ ] Ensure the dnd-kit `KeyboardSensor` is properly announced to screen readers via ARIA live regions
- [ ] Add a keyboard shortcut reference panel (accessible via `?` key)

### 🟢 Virtual Scrolling for Large Task Lists

- [ ] Add `@tanstack/virtual` (or `preact-virtual`) as a dependency
- [ ] Implement windowed rendering in `BacklogView` task grid
- [ ] Implement windowed rendering in `SprintView` task list
- [ ] Implement windowed rendering in each `KanbanColumn` when the task count exceeds 50

---

## Ongoing / Evergreen Tasks

These have no single completion point — they should be revisited every sprint.

- [ ] **Run `npm run lint` (tsc --noEmit) in CI** — currently there is no automated type-checking gate
- [ ] **Write at least one integration test per new `db.ts` method** — the persistence layer has zero test coverage
- [ ] **Performance budget check** — after each feature addition, measure board render time with 100 mock tasks and ensure it stays under 100ms
- [ ] **Accessibility audit** — run axe-core or Lighthouse accessibility audit on each major view quarterly
- [ ] **Bump `CACHE_NAME`** in `sw.js` on every deploy (until `vite-plugin-pwa` migration is complete)
- [ ] **Review and rotate the Gemini API key** if the app is deployed anywhere publicly accessible

---

## Progress Tracker

| Phase | Total Tasks | Done | Remaining |
|---|---|---|---|
| Phase 0 — Stop the Bleeding | 22 | 0 | 22 |
| Phase 1 — Core Promises | 23 | 0 | 23 |
| Phase 2 — Quality & Reliability | 37 | 0 | 37 |
| Phase 3 — Feature Expansion | 30 | 0 | 30 |
| **Total** | **112** | **0** | **112** |

> Update the "Done" column manually as tasks are completed, or use GitHub Issues/Projects to track this automatically.
