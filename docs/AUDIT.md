# Project Tracker Pro — Code Audit
> March 2026 · Stack: Preact 10 + Vite 6 + SQLite WASM 3.51 + Tailwind v4 · PWA / Local-First  
> Auditor: Claude Sonnet 4.6

---

## 1. Executive Summary

The project is in a **broken-but-recoverable state**. The architectural foundation — local-first SQLite WASM, IndexedDB binary persistence, Preact for performance — is sound. The visual layer (components, styling, routing shell) is polished and well-structured. However, a critical divergence exists between the `db.ts` refactor (which migrated to a `project_members`/`collaborators` model and removed the `users`/`project_users` tables) and the rest of the codebase, which was never updated to reflect that migration. Every view that previously called `db.getUsers()`, `db.getProjectTeam()`, `db.addUser()`, `db.updateUser()`, `db.deleteUser()`, `db.addUserToProject()`, or `db.removeUserFromProject()` now calls methods that no longer exist. Six of the eight main views crash on any user interaction. Beyond this breakage, the persistence layer has a known data-loss race condition, the PWA icons point to external URLs that fail offline, and the seeder still references the deleted `users`/`project_users` tables it used to populate.

The codebase has no CI pipeline, no linter, no formatter, and TypeScript strict mode is disabled — meaning none of these crashes surface until runtime.

---

## 2. Critical Findings 🔴

### 2.1 Seven Missing `db.ts` Methods Crash Six Views at Runtime

The `db.ts` refactor deleted the entire `users`/`project_users` model and replaced it with `project_members`. The refactor was **not propagated** to any view, component, or form. The following methods are called across the codebase but do not exist in `DatabaseService`:

| Method called | Called from | Result |
|---|---|---|
| `db.getUsers()` | `App.tsx` line ~53, `ProfileSettingsView.tsx` line ~34, `DashboardView.tsx` line ~45 | `TypeError: db.getUsers is not a function` |
| `db.getProjectTeam(projectId)` | `BacklogView.tsx` line ~19, `BoardView.tsx` line ~24, `TaskDetailModal.tsx` line ~78 | `TypeError: db.getProjectTeam is not a function` |
| `db.addUser(user)` | `ProfileSettingsView.tsx` line ~46, `ProjectSettingsView.tsx` line ~82, `TeamView.tsx` line ~52 | `TypeError: db.addUser is not a function` |
| `db.updateUser(id, data)` | `ProfileSettingsView.tsx` line ~83 | `TypeError: db.updateUser is not a function` |
| `db.deleteUser(userId)` | `ProjectSettingsView.tsx` line ~96, `TeamView.tsx` (not present but referenced in event handler) | `TypeError: db.deleteUser is not a function` |
| `db.addUserToProject(projectId, userId)` | `ProjectSettingsView.tsx` line ~74, `TeamView.tsx` line ~32 | `TypeError: db.addUserToProject is not a function` |
| `db.removeUserFromProject(projectId, userId)` | `ProjectSettingsView.tsx` line ~87, `TeamView.tsx` line ~44 | `TypeError: db.removeUserFromProject is not a function` |

**Impact:** `ProfileSettingsView`, `ProjectSettingsView`, `TeamView`, `BacklogView`, `BoardView`, and `TaskDetailModal` all throw unhandled promise rejections on load or on any data-fetching interaction. Five of the six are core navigation tabs.

**Fix:** Replace all seven deleted method calls with the new `project_members`-based equivalents: `db.getProjectMembers(projectId)`, `db.addProjectMember(...)`, `db.removeProjectMember(...)`. The `db.getUsers()` call in `App.tsx` (`refreshUser()`) must be rewritten to use `db.getOwner()` or removed entirely. Full mapping in ROADMAP Phase 0.

---

### 2.2 `App.tsx` `refreshUser()` References Deleted `User` Type and Deleted `db.getUsers()`

`App.tsx` lines ~44–60 contain `refreshUser()` which calls `db.getUsers()` (deleted), references the `User` type (deleted from `db.ts`), and reads `user.initials` (a field that no longer exists on any db type). The `currentUser` state is typed `User | null` and passed as a prop to `Sidebar` and `Navbar`, both of which also import `User` from `db.ts`.

**Impact:** `App.tsx` fails to compile. If it reaches runtime, `refreshUser()` throws on every mount and every `profileUpdated` event, leaving `currentUser` permanently null and crashing the avatar/name display in both nav components.

**Fix:** Remove `currentUser` state, `refreshUser()`, the `profileUpdated` listener, and the `User` import from `App.tsx`. Wire `Sidebar` and `Navbar` to accept `displayName: string` and `photoUrl?: string` props derived from the auth layer (Phase 1) or remove those props entirely for now (Phase 0 stub).

---

### 2.3 `seeder.ts` Still Inserts into Deleted `users` and `project_users` Tables

`seeder.ts` lines ~22–55 contain:
- `INSERT OR IGNORE INTO users ...` — table does not exist; SQLite will throw
- `INSERT INTO project_users ...` — table does not exist; SQLite will throw
- References to `SEED_USERS` from `seedData.ts` — the array still exists in `seedData.ts` despite the Phase 0 intent to remove it
- Construction of `otherUserIds` array used to populate `project_users`
- `localStorage.setItem('myUserId', ...)` — sets an identity value the new db model no longer relies on

**Impact:** On a fresh install (empty IndexedDB), `performSeed()` is called during `db.init()`. It throws when it tries to insert into `users`, the transaction fails mid-execution, and the app is left with either no data or partially-seeded data. The user sees a blank app with no projects.

**Fix:** Remove all `users`/`project_users` inserts, the `otherUserIds` variable, the `SEED_USERS` import, and `localStorage.setItem('myUserId', ...)` from `seeder.ts`. Tasks should seed with empty `assignee_ids`. Seeder verified clean per Phase 0 Step 3 partial completion marker in the ROADMAP (Step 3 shows `[x]` on verification but preceding removal tasks are `[ ]` — this is inconsistent).

---

### 2.4 `Navigation.tsx` (Sidebar + Navbar) Import and Use Deleted `User` Type

`Navigation.tsx` line ~5 imports `User` from `../services/db`. This type no longer exists. `Sidebar` and `Navbar` both accept `currentUser: User | null` in their props. Because the `User` interface is gone, the TypeScript compiler will throw a module-resolution error, and at runtime the prop arrives as `null` (from the broken `refreshUser()` in App.tsx), rendering `??` initials permanently in the nav.

**Fix:** Remove the `User` import and `currentUser` prop from both components. Replace with `displayName?: string` and `photoUrl?: string`. For Phase 0, these can render a static placeholder.

---

### 2.5 `TaskDetailModal.tsx` Calls `db.getProjectTeam()` (Deleted)

`TaskDetailModal.tsx` line ~78 calls `db.getProjectTeam(task.projectId)` to populate the assignee picker and the comment author avatars. This method was deleted in the db refactor and replaced by `db.getProjectMembers(projectId)`.

**Impact:** Every time a user opens a task detail modal, `fetchData()` throws, leaving `team`, `comments`, and `subtasks` all empty. The Assignees panel and comment thread both fail silently.

**Fix:** `src/components/TaskDetailModal.tsx` line ~78, `getProjectTeam(task.projectId)` → replace with `db.getProjectMembers(task.projectId)`. Update the `team` state type from `User[]` to `ProjectMember[]`. Update the avatar render to use `m.displayName` and `m.photoUrl` instead of `u.initials`/`u.avatarUrl`.

---

### 2.6 `db.addProject()` Still Calls Deleted `project_users` Insert

`db.ts` `addProject()` method (line ~185 approximately) contains:
```ts
const myId = localStorage.getItem('myUserId');
if (myId) this.db.exec({ sql: 'INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)', bind: [id, myId, 'Owner'] });
```
The `project_users` table was removed in the schema migration. This `INSERT` will throw a SQLite "no such table" error every time a new project is created.

**Impact:** `handleCreateProject` in `App.tsx` fails silently after inserting the project itself, leaving the project without an owner record and crashing silently on the follow-up persist. Depending on SQLite error handling, the project row itself may or may not have committed.

**Fix:** `src/services/db.ts` `addProject()` method — remove the `INSERT INTO project_users` block entirely. In Phase 1 this will be replaced by `db.addProjectMember()`.

---

### 2.7 `db.manualSeed()` References Deleted Tables in DELETE Statements

`db.ts` line ~170 (approximately):
```ts
this.db.exec('DELETE FROM project_users; DELETE FROM projects; DELETE FROM users; ...');
```
Both `project_users` and `users` tables were deleted from `createTables()`. Executing this `manualSeed()` reset will throw a SQLite "no such table" error.

**Fix:** `src/services/db.ts` `manualSeed()` — remove `DELETE FROM project_users;` and `DELETE FROM users;` from the exec string.

---

### 2.8 `beforeunload` Persistence Race Condition — Data Loss on Tab Close

`db.ts` (near the end of `init()`) registers:
```ts
window.addEventListener('beforeunload', () => this.persist());
```
`persist()` is `async`. `beforeunload` does not await promises. The browser will close the tab before the IndexedDB write completes. Any dirty state from the last 2-second debounce window is silently lost.

**Impact:** Users who close the tab within 2 seconds of a write lose that data with no warning. This is a documented known issue from the original audit.

**Fix:** Replace `beforeunload` with a `visibilitychange` listener as the primary trigger. Keep `beforeunload` as a fire-and-hope secondary. Add an `isDirty` flag so unnecessary writes are avoided.

---

### 2.9 PWA Manifest Icons Point to External Google CDN URLs — Offline Install Fails

`public/manifest.json` and `index.html` both reference `lh3.googleusercontent.com` for the app icons. These are not cached by the service worker and are unavailable offline.

**Impact:** PWA install prompts may be rejected by browsers that validate icon reachability. On an offline device, the installed PWA shows a broken icon. The `apple-touch-icon` in `index.html` also points to the same external URL.

**Fix:** Download both icons and save to `public/icons/icon-192.png` and `public/icons/icon-512.png`. Update both `manifest.json` `src` fields and the `index.html` `apple-touch-icon` href to local paths.

---

### 2.10 `CalendarView.tsx` Creates Tasks with Non-Existent `assigneeId` Field

`CalendarView.tsx` `handleAddTask()` constructs a task object with `assigneeId: myUserId || undefined` (singular). The `Task` interface uses `assigneeIds: string[]` (plural array). The `db.addTask()` method reads `t.assigneeIds` (array). The singular `assigneeId` field is silently ignored, producing tasks with no assignees.

**Fix:** `src/views/CalendarView.tsx` `handleAddTask()` — remove `assigneeId` from the task object literal. Tasks created from the calendar will be unassigned until auth is wired in Phase 1.

---

### 2.11 `CalendarView.tsx` Loading State Has No `return` — Spinner Never Renders

`CalendarView.tsx` lines ~95–98:
```ts
if (loading) {
  // ... (rest of loading check)
}
```
The `if (loading)` block contains only a comment — there is no `return` statement and no JSX. The component proceeds to render with empty `tasks` state while `loading` is `true`, producing a flash of empty calendar.

**Fix:** `src/views/CalendarView.tsx` line ~97 — replace the comment stub with `return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;`

---

### 2.12 `DashboardView.tsx` "View all tasks" Route Uses `currentProject.id` Instead of Slugified Name

`DashboardView.tsx` line ~145 (approximately):
```ts
onClick={() => route(`/project/${currentProject.id}/board`)}
```
The router uses slugified project names (`/project/apollo_platform/board`), not IDs. This navigates to a non-existent route and renders the fallback `DashboardView` in a loop.

**Fix:** `src/views/DashboardView.tsx` — replace `currentProject.id` with `slugify(currentProject.name)`. The `slugify` helper must be imported or inlined.

---

### 2.13 `BoardView.tsx` — `onDelete` and `onArchive` Not Wired Through `SortableTaskCard`

`TaskCard` accepts `onDelete` and `onArchive` props. `SortableTaskCard` in `BoardView.tsx` never passes these props. The context menu in the board renders Delete and Archive buttons that fire no handlers.

**Fix:** `src/views/BoardView.tsx` `SortableTaskCard` — add `onDelete={() => db.deleteTask(task.id).then(fetchData)}` and `onArchive={() => db.updateTask(task.id, { isArchived: true }).then(fetchData)}` props to the `<TaskCard>` inside `SortableTaskCard`.

---

## 3. Architecture Issues 🟠

### 3.1 Dual Source of Truth — `currentProjectId` State vs. URL

`App.tsx` maintains `currentProjectId` in React state AND derives the current project from `window.location.pathname` via the `handleRouteChange` `popstate` listener. These two sources can diverge when `route()` is called programmatically inside child components without triggering a `popstate` event. The result is that the sidebar highlight and the view content can show different projects.

**Fix (Phase 2):** Remove `currentProjectId` from `App.tsx` state entirely. Derive `currentProject` via `useMemo` on `window.location.pathname` + `projects` array. Remove the `popstate` listener.

---

### 3.2 `localStorage.getItem('myUserId')` Scattered Across 6+ Files

Despite the db refactor removing the concept of a local user identity, `localStorage.getItem('myUserId')` still appears in `App.tsx`, `db.ts` (`addTask`, `addProject`), `TaskForm.tsx`, `TaskDetailModal.tsx`, `BoardView.tsx`, and `src/main.tsx`. On a fresh install or cleared storage, this returns `null` or the fallback string `'me'`, which is not a valid UUID and will silently produce tasks with a malformed `assignee_ids` string.

**Fix (Phase 1):** Centralize identity behind a `useAuth()` hook backed by Firebase. In Phase 0, remove the `localStorage.setItem('myUserId', 'me')` line from `main.tsx` and guard all `getItem('myUserId')` reads so they never produce `'me'` as a real assignee ID.

---

### 3.3 No Error Boundaries — Any Runtime Error Crashes the Entire App

There are zero Preact/React error boundaries anywhere in the component tree. Given the number of broken method calls documented above, any uncaught throw in `BoardView`, `TaskDetailModal`, `SprintView`, or any other view will unmount the entire app, showing a blank white screen with no recovery path.

**Fix (Phase 1):** Create `<ErrorBoundary>` as a Preact class component. Wrap every top-level route view.

---

### 3.4 `IndexedDBStorage` Store Name Still Uses `project_tracker_v5_tables`

The `IndexedDBStorage` class in `db.ts` uses `dbName = 'project_tracker_v5_tables'`. The schema refactor (removing `users`/`project_users`, adding `project_members`) constitutes a breaking schema change. Restoring from a v5 IndexedDB store into the new v6 schema will silently attempt to restore `users` and `project_users` data into tables that no longer exist. The `db.init()` restore loop already skips these with `if (tableName === 'users' || tableName === 'project_users') continue` — but the version name does not reflect the actual schema version, making future migrations ambiguous.

**Fix (Phase 2):** Rename the store to `project_tracker_v6_tables` and add a `schema_version` key to IndexedDB. This forces a clean restore from a fresh seed for any user upgrading from v5, preventing silent corruption.

---

### 3.5 `db.ts` Has No `Sprint` Interface Export Despite `SprintView` Importing It

`SprintView.tsx` line ~2 imports `Sprint` from `'../services/db'`. The `db.ts` file does not export a `Sprint` interface. This is a compile-time error that also causes a runtime failure when `SprintView` tries to type its state.

**Fix (Phase 0 — DB Layer — Missing Sprint Methods):** Add `export interface Sprint { id: string; projectId: string; name: string; startDate: string; endDate: string; status: 'planned' | 'active' | 'completed' }` to `db.ts`.

---

### 3.6 `TeamView.tsx` Missing `useState` and `useEffect` Imports

`TeamView.tsx` uses `useState` and `useEffect` but the import line (`import { useState, useEffect } from 'preact/hooks'`) is absent from the file as provided. Same issue in the component body — the hooks are called but will throw `useState is not defined` at runtime.

**Fix (⚡ Quick Win):** Add `import { useState, useEffect } from 'preact/hooks'` to `src/views/TeamView.tsx`.

---

## 4. Code Quality Issues 🟡

### 4.1 `db.ts` is a 280+ Line God Object With `any` Throughout

The entire database service is a single class handling schema creation, persistence, projects, tasks, columns, subtasks, comments, activities, members, and sprints. All row callbacks use `(r: any[])` with positional array indexing — adding or reordering a column silently breaks all data mapping for that table with no type error.

**Fix (Phase 2):** Split into domain repositories under `src/services/repos/`. Define typed row tuples per table. Enable `"strict": true` in `tsconfig.json`.

---

### 4.2 `TaskDetailModal.tsx` is 350+ Lines — Single File Handles 6 Distinct Concerns

Title/completion, subtasks, comments, assignees, timer, and progress are all managed in one component with interleaved state, effects, and JSX. This makes the file difficult to test, modify, or reason about in isolation.

**Fix (Phase 2):** Extract `<TaskHeader>`, `<SubtaskList>`, `<CommentThread>`, `<AssigneePanel>`, `<TimeTracker>`, `<TaskMetaPanel>`.

---

### 4.3 Inline SQL Strings With No Error Logging in Development

All SQL is written as raw strings in `db.ts`. The `.exec()` call silently no-ops on malformed SQL or constraint violations in many SQLite WASM configurations. There is no `runSql()` wrapper that logs errors in development, making DB bugs invisible without DevTools open.

**Fix (Phase 2):** Add a `runSql(sql: string, bind?: any[])` wrapper that catches and logs errors with the SQL and bind values in `development` mode.

---

### 4.4 `seedData.ts` Still Exports `SEED_USERS` and `assigneeType` Fields

`seedData.ts` still contains the `SEED_USERS` array and every task object in `SEED_TASKS` still has an `assigneeType` field. These are vestigial from the old `users` model. `seeder.ts` imports `SEED_USERS` and uses `assigneeType` to build assignee arrays that populate the deleted `users`/`project_users` tables.

**Fix (Phase 0 — Seeder Cleanup):** Remove `SEED_USERS`, the `User` import, and `assigneeType` from all objects in `SEED_TASKS` in `seedData.ts`. Remove all consumer logic in `seeder.ts`.

---

### 4.5 `package.json` Has `vite` in Both `dependencies` and `devDependencies`

`vite: ^6.2.0` appears in both sections. This causes ambiguous lock-file resolution and inflates the production dependency footprint.

**Fix (⚡ Quick Win):** Remove `vite` from `dependencies`, keep only in `devDependencies`.

---

### 4.6 `vite-plugin-pwa` in `package.json` but Not Installed and Not Used

`package.json` lists `"vite-plugin-pwa": "^0.21.1"` in `dependencies` but it is absent from `package-lock.json` (never installed) and not imported in `vite.config.ts`. The project uses a hand-rolled `public/sw.js` instead, creating a confusing hybrid that implies PWA tooling that isn't active.

**Fix (Phase 2):** Decide: configure `vite-plugin-pwa` properly or remove it from `package.json`.

---

### 4.7 `Avatar` Component Still Uses Old `initials`/`src` Props

`Avatar.tsx` still accepts `initials?: string` and `src?: string`. The new collaborator model uses `displayName: string` and `photoUrl?: string`. All call sites that pass `initials` to `Avatar` are coupling the display layer to the old identity model.

**Fix (Phase 0 — Step 7):** Update `Avatar` to accept `displayName: string` and `photoUrl?: string`. Derive initials internally. Update all call sites.

---

## 5. Security Issues 🟠

### 5.1 `GEMINI_API_KEY` Inlined into Client Bundle

`vite.config.ts` uses `define: { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) }`. This embeds the API key directly into the production JavaScript bundle as a string literal. Anyone who views source in DevTools or decompiles the bundle has the key.

**Impact:** For a locally-installed PWA used by a single user who controls the key, this is acceptable with explicit documentation. For any shared or hosted deployment, this is a key leak.

**Fix (Phase 2):** Route all Gemini calls through the Express proxy server (already a dependency). Move the key server-side. Document the local-use assumption clearly in `.env.example`.

---

### 5.2 No Input Length Validation on Any Text Field

Task titles, descriptions, project names, and comment content are passed directly to SQLite with no `maxLength` constraint on inputs and no server-side trim/reject. A user can paste a multi-megabyte string into a task title, which will be stored and then slow every board render.

**Fix (Phase 2):** Add `maxLength` attributes to all inputs and service-layer validation in `db.addTask()` / `db.updateTask()`.

---

## 6. Performance Issues 🟡

### 6.1 Full `fetchData()` Re-Fetch on Every Board Interaction

`BoardView.tsx` calls `fetchData()` after every drag-end, task creation, task update, and task deletion. Each call re-queries all tasks for the project and re-renders all columns. At 200+ tasks this produces visible lag.

**Fix (Phase 2):** Use optimistic updates — update local state immediately, write to SQLite in the background, re-fetch only on error.

---

### 6.2 SQLite WASM Cold Start Blocks Main Thread for 300–800ms

The first load initializes SQLite WASM, opens the database, checks for existing data, and potentially runs the seeder before the UI is interactive. The current `"Initializing Database..."` text is shown but the transition is jarring.

**Fix (Phase 2):** Show a proper splash with step-by-step progress text. Consider pre-warming WASM in the `LoginView` render cycle so it is ready before the user enters the app.

---

### 6.3 No Virtualization on Task Lists in `BacklogView` and `SprintView`

Both views render all tasks as a flat grid/list. At 500+ tasks this will cause significant DOM bloat.

**Fix (Phase 3):** Add `@tanstack/virtual` windowed rendering to both views.

---

## 7. Reliability Issues 🟠

### 7.1 Service Worker Caches Only `index.html` — JS/CSS Chunks Not Pre-Cached

`public/sw.js` `ASSETS_TO_CACHE` only caches `/`, `/index.html`, and `/manifest.json`. Vite produces hashed JS/CSS bundles (`assets/index-a3b4c5.js`). These are NOT pre-cached. Every cold start requires a network request for the main bundle even when the app claims to be offline-ready.

**Fix (Phase 2):** Configure `vite-plugin-pwa` to auto-generate a precache manifest from Vite's build output, or add a build script that injects asset hashes into `sw.js` at build time.

---

### 7.2 Service Worker Cache Name Hardcoded — Manual Bump Required on Every Deploy

`sw.js` line 1: `const CACHE_NAME = 'project-tracker-v2'`. Every asset change requires manually bumping this string. Forgetting to do so serves stale assets to users.

**Fix (Phase 2):** Auto-generate the cache name from the build hash, or migrate to `vite-plugin-pwa`.

---

### 7.3 No Data Export / Backup Feature

All data lives in IndexedDB. Clearing browser data permanently destroys all project information with no recovery path. This is in direct conflict with the product's "data ownership" positioning.

**Fix (Phase 1):** Add JSON export and SQLite blob download to `ProjectSettingsView`.

---

### 7.4 No Schema Versioning — Silent Corruption on Schema Change

The IndexedDB persistence stores table data as plain objects keyed by column name. Adding, removing, or renaming a column in `createTables()` will silently produce `undefined` values for any rows restored from a prior schema version. There is no migration layer.

**Fix (Phase 2):** Add a `schema_version` key to IndexedDB. Implement a `migrateSchema(fromVersion)` function. Wrap all migrations in transactions.

---

## 8. Quick Wins ⚡

- `src/views/TeamView.tsx` — add `import { useState, useEffect } from 'preact/hooks'`
- `src/views/SprintView.tsx` — add `import { useState, useEffect } from 'preact/hooks'`
- `package.json` — remove duplicate `vite` entry from `dependencies`
- `package.json` — remove `vite-plugin-pwa` or install and configure it
- `src/main.tsx` — remove `localStorage.setItem('myUserId', 'me')` (identity no longer assigned here)
- `src/services/db.ts` `manualSeed()` — remove `DELETE FROM project_users; DELETE FROM users;` from the exec string
- `index.html` — add `<meta name="apple-mobile-web-app-title" content="TrackerPro" />`
- `src/services/seeder.ts` — add `localStorage.setItem('hasSeenLanding', 'true')` (currently only sets `isLoggedIn`)

---

## Appendix: File Health Summary

| File | Lines | Health | Notes |
|---|---|---|---|
| `src/services/db.ts` | ~280 | ❌ | `addProject` inserts into deleted table; `manualSeed` deletes deleted tables; still has `getProjectTeam`/`getUsers` called elsewhere; `IndexedDB` store name is stale |
| `src/services/seeder.ts` | ~80 | ❌ | Inserts into deleted `users`/`project_users`; references `SEED_USERS`; sets `myUserId` in localStorage |
| `src/services/seedData.ts` | ~70 | ⚠️ | Still exports `SEED_USERS`; all tasks have `assigneeType` field referencing deleted model |
| `src/App.tsx` | ~170 | ❌ | `refreshUser()` calls deleted `db.getUsers()`; imports and uses deleted `User` type; `currentUser` state broken |
| `src/components/Navigation.tsx` | ~230 | ❌ | Imports deleted `User` type; `currentUser: User \| null` prop broken in both `Sidebar` and `Navbar` |
| `src/components/TaskDetailModal.tsx` | ~350 | ❌ | Calls deleted `db.getProjectTeam()`; `User[]` type references deleted interface |
| `src/components/TaskForm.tsx` | ~110 | ⚠️ | Accepts `users?: User[]` prop; `User` type deleted; will break when callers try to pass team members |
| `src/components/Avatar.tsx` | ~25 | ⚠️ | Still uses old `initials`/`src` props instead of new `displayName`/`photoUrl` |
| `src/views/ProfileSettingsView.tsx` | ~130 | ❌ | Calls `db.getUsers()`, `db.addUser()`, `db.updateUser()` — all deleted |
| `src/views/ProjectSettingsView.tsx` | ~330 | ❌ | Calls `db.addUserToProject()`, `db.removeUserFromProject()`, `db.deleteUser()`, `db.getProjectTeam()`, `db.getUsers()` — all deleted |
| `src/views/TeamView.tsx` | ~200 | ❌ | Missing `useState`/`useEffect` imports; calls `db.addUser()`, `db.addUserToProject()`, `db.removeUserFromProject()`, `db.getProjectTeam()`, `db.getUsers()` — all deleted |
| `src/views/BoardView.tsx` | ~200 | ⚠️ | Calls deleted `db.getProjectTeam()`; `onDelete`/`onArchive` not wired in `SortableTaskCard` |
| `src/views/BacklogView.tsx` | ~110 | ⚠️ | Calls deleted `db.getProjectTeam()` |
| `src/views/CalendarView.tsx` | ~230 | ❌ | Broken loading state (no return); `assigneeId` field (singular) doesn't exist on `Task` |
| `src/views/DashboardView.tsx` | ~200 | ⚠️ | Broken "View all tasks" route uses `currentProject.id`; calls `db.getUsers()` |
| `src/views/SprintView.tsx` | ~170 | ❌ | Missing hook imports; imports `Sprint` type not exported from `db.ts`; `db.getSprints()`/`db.addSprint()` missing |
| `src/views/StorybookView.tsx` | ~60 | ✅ | Clean, self-contained |
| `src/views/LandingView.tsx` | ~200 | ✅ | Clean |
| `src/views/LoginView.tsx` | ~130 | ✅ | Clean (simulated auth, will be replaced in Phase 1) |
| `src/components/Modal.tsx` | ~50 | ✅ | Clean |
| `src/components/KanbanColumn.tsx` | ~50 | ✅ | Clean |
| `src/components/TaskCard.tsx` | ~130 | ✅ | Clean (delete/archive props accepted but not wired from board) |
| `public/sw.js` | ~90 | ⚠️ | Does not cache hashed JS/CSS chunks; cache name hardcoded |
| `public/manifest.json` | ~20 | 🔴 | Both icons point to external CDN URLs — offline install fails |
| `vite.config.ts` | ~40 | ✅ | Clean |
| `package.json` | ~40 | ⚠️ | `vite` duplicated; `vite-plugin-pwa` listed but not installed |
| `tsconfig.json` | ~20 | ⚠️ | `strict` not enabled; no `noUnusedLocals` / `noImplicitReturns` |

**Legend:** ✅ Good · ⚠️ Significant issues · ❌ Broken at runtime
