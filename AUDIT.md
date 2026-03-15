# Project Tracker Pro — Code Audit & Roadmap
> Last reviewed: March 2026 · Stack: Preact + Vite + SQLite WASM + Tailwind v4 · PWA/Local-First

---

## 1. Executive Summary

The project is in a **solid early-production state**. The architecture choices — local-first with SQLite WASM, binary persistence via IndexedDB, Preact for performance — are sound and forward-thinking. The UI component library is coherent and the overall UX structure (Kanban, Dashboard, Calendar, Sprints) covers the core PM surface area well.

However, there are several **broken contracts** between the codebase and its own data model, a handful of **runtime hazards**, and a clear **feature gap** between what the session summary says was built and what the source code reflects. The sections below detail findings by severity, then offer a prioritized roadmap.

---

## 2. Critical Bugs & Broken Contracts

### 2.1 `db.ts` Missing Methods Referenced Across the App

The `DatabaseService` class is missing the following methods that are called from views:

| Method | Called From | Status |
|---|---|---|
| `db.addUser()` | `ProfileSettingsView`, `ProjectSettingsView`, `TeamView` | ❌ Missing |
| `db.updateUser()` | `ProfileSettingsView` | ❌ Missing |
| `db.deleteUser()` | `ProjectSettingsView` | ❌ Missing |
| `db.addUserToProject()` | `ProjectSettingsView`, `TeamView` | ❌ Missing |
| `db.removeUserFromProject()` | `ProjectSettingsView`, `TeamView` | ❌ Missing |
| `db.getSprints()` | `SprintView` | ❌ Missing |
| `db.addSprint()` | `SprintView` | ❌ Missing |

**Impact:** `ProfileSettingsView`, `ProjectSettingsView`, `TeamView`, and `SprintView` will all throw at runtime on any user interaction. These are not small paths — they are core navigation tabs.

**Fix:** Implement all missing methods in `db.ts` following the existing pattern. The `Sprint` interface is also missing from the exported types (it's imported in `SprintView` but not exported from `db.ts`).

---

### 2.2 `CalendarView` — Stale `addTask` Signature

```ts
// CalendarView.tsx line ~66 — uses a field that doesn't exist on Task
const newTask = {
  ...
  assigneeId: myUserId || undefined   // ← singular, doesn't exist
};
```

The `Task` interface uses `assigneeIds: string[]` (plural array), not `assigneeId`. This will silently produce tasks with no assignees and may cause a runtime error depending on how SQLite handles the extra field.

---

### 2.3 `ProfileSettingsView` — `db.addUser()` Fallback Will Always Throw

```ts
// ProfileSettingsView.tsx ~line 46
const id = await db.addUser({ ... });
```

Since `addUser` doesn't exist, any fresh install where users haven't been seeded will show a blank profile screen and throw an unhandled promise rejection.

---

### 2.4 Duplicate `vite` Dependency

`package.json` declares `vite` in both `dependencies` and `devDependencies`. This is harmless in most build pipelines but causes confusing lock-file resolution and should be cleaned up — vite belongs only in `devDependencies`.

---

### 2.5 `vite-plugin-pwa` Listed in `package.json` but Not in `package-lock.json` or `vite.config.ts`

`package.json` lists `"vite-plugin-pwa": "^0.21.1"` as a dependency but it is absent from `package-lock.json` (meaning it was never actually installed) and is not imported in `vite.config.ts`. The project uses a hand-rolled `public/sw.js` instead. Either remove the dependency or migrate to the plugin — the current hybrid is confusing.

---

### 2.6 `SprintView` — `useState` Called Without Import

```ts
// SprintView.tsx line ~2 — no import statement visible
const [sprints, setSprints] = useState<Sprint[]>([]);
```

`useState` and `useEffect` are used but the import line (`import { useState, useEffect } from 'preact/hooks'`) is missing from the file as provided. Same issue in `TeamView`. This is likely a copy/paste artefact in the provided source, but worth double-checking — the TS compiler would catch this, but only if `lint` is actually run.

---

## 3. Architecture & Design Issues

### 3.1 Persistence Strategy Has a Race Condition

`schedulePersist()` debounces writes by 2 seconds. If the user performs a write operation and closes the tab within 2 seconds, data is lost. The `beforeunload` listener calls `persist()` directly, which is correct — **but `persist()` is async and `beforeunload` does not await promises**. The browser will close before the IndexedDB write completes.

**Fix:** Use a synchronous fallback. The safest pattern is to keep a dirty flag and use `visibilitychange` (fires before unload, gives more time) combined with `beforeunload` as a last resort. Alternatively, switch to OPFS for true atomic persistence.

```ts
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') this.persist();
});
```

---

### 3.2 `persist()` Column-Name Mapping is Fragile

The current persist logic reads `PRAGMA table_info()` to get column names, then maps them to camelCase. The restore logic does the reverse with a regex. This works until a column name has an edge case (e.g. `is_timer_running` → `isTimerRunning` → `is_timer_running` is correct, but `sprint_id` → `sprintId` → `sprint_id` also correct). The fragility is that **any schema change silently breaks old IndexedDB data** because the column lists are not versioned. Consider storing data as raw SQL INSERT strings or adding a schema version key.

---

### 3.3 `currentProjectId` State vs. URL Routing — Dual Source of Truth

`App.tsx` maintains `currentProjectId` in React state AND reads it from the URL via `preact-router`. These two sources can diverge (e.g. user navigates directly to a URL, the router fires but state hasn't updated yet). The `handleRouteChange` listener attached to `popstate` partially addresses this but doesn't cover programmatic `route()` calls inside child components.

**Recommendation:** Make the URL the single source of truth. Remove `currentProjectId` from App state entirely. Instead, derive the current project by parsing `window.location.pathname` on every render, memoized with `useMemo`.

---

### 3.4 `localStorage` Used as a User Identity System

Using `localStorage.getItem('myUserId')` scattered across 8+ files (`db.ts`, `seeder.ts`, `TaskForm.tsx`, `TaskDetailModal.tsx`, `BoardView.tsx`, etc.) is fragile. There is no central auth context, so any file can read a stale or missing value. On a fresh browser (cleared storage), `myUserId` defaults to the string `'me'` which is not a valid UUID and may fail FK constraints.

**Fix:** Create a `useCurrentUser()` hook backed by a Preact context that is initialized once during `App` startup and injected where needed.

---

### 3.5 No Error Boundary

There are no React/Preact error boundaries anywhere. A runtime error in `BoardView` (e.g. from a missing db method) will unmount the entire app and show a blank white screen with no user feedback.

---

## 4. Code Quality & Maintainability

### 4.1 `db.ts` is a 200+ Line God Object

The entire database service is a single class in a single file. As the feature set grows (Sprints, AI, Comments, Activities, Users, Projects, Columns, Tasks, Subtasks) this will become unmaintainable. Consider splitting into domain repositories:

```
src/services/
  db.ts          ← init, schema, persist (keep)
  repos/
    projects.ts
    tasks.ts
    users.ts
    sprints.ts
    comments.ts
```

---

### 4.2 Inline SQL Strings Everywhere

SQL is written as raw strings throughout `db.ts` with no abstraction layer. Typos in column names or table names will produce silent SQLite errors (the current `.exec()` usage doesn't throw on bad SQL — it silently no-ops in some configurations). Consider a thin query builder or at minimum a `runSql(sql, bind)` wrapper that logs errors in dev.

---

### 4.3 `any` Type Overuse

`db.ts` uses `any` for nearly all row callbacks: `callback: (r: any[]) => ...`. This defeats TypeScript's purpose. The row arrays are positional and fragile — adding a column to a table in the wrong position will silently corrupt data mapping. A typed row mapper or even a simple interface per table would prevent this class of bug.

---

### 4.4 `TaskDetailModal` is 350+ Lines — Needs Decomposition

`TaskDetailModal.tsx` handles: task editing, subtasks, comments, assignees, timer, and progress. Each of these is a distinct concern. Suggested decomposition:

- `<TaskHeader />` — title, status, priority
- `<SubtaskList />` — subtask CRUD
- `<CommentThread />` — comments
- `<AssigneePanel />` — assignee management
- `<TimeTracker />` — timer display + controls
- `<TaskMetaPanel />` — due date, progress bar, sidebar info

---

### 4.5 `BoardView.tsx` — `onDelete` and `onArchive` Handlers Are Wired in `TaskCard` Props but Never Passed in `BoardView`

`TaskCard` accepts `onDelete` and `onArchive` props. The `SortableTaskCard` wrapper in `BoardView` never passes these. Clicking "Delete" or "Archive" from the task card context menu inside the board does nothing (the menu opens, buttons render, but no handler fires).

---

### 4.6 Dead Code

- `src/views/DashboardView.tsx` — `route(`/project/${currentProject.id}/board`)` uses `currentProject.id` but routing uses slugified names, not IDs. This will navigate to a 404.
- `CalendarView.tsx` — `if (loading) { // ... (rest of loading check) }` contains a comment stub with no return, meaning the loading spinner is never shown.
- `BacklogView.tsx` — The "backlog" is defined as tasks with no assignees, but the session summary describes it differently. The definition should be formalized (e.g. a dedicated `is_backlog` flag or column type).

---

## 5. UX & Feature Gaps

### 5.1 Missing Features (Promised in Session Summary, Not Yet Shipped)

| Feature | Where Expected | Status |
|---|---|---|
| Sprint management (CRUD) | `SprintView` | UI exists, db methods missing |
| User profile editing | `ProfileSettingsView` | UI exists, `updateUser` missing |
| Team management | `TeamView` | UI exists, `addUserToProject` missing |
| Activity feed population | `DashboardView` | Table exists, nothing writes to it after seed |
| Task archiving | `TaskCard` menu | Handler not wired |
| Timer persistence | `TaskCard` / `TaskDetailModal` | Works in detail modal, not wired in board card |

---

### 5.2 Search Doesn't Work on Mobile

The search input in `Navbar` is `hidden` on small screens (`hidden sm:block`). The `BottomNav` has no search entry point. Mobile users have no way to search tasks.

**Fix:** Add a search icon to `BottomNav` that opens a full-screen search overlay, or make the Navbar search visible on mobile.

---

### 5.3 Offline Indicator is Misleading

The amber "working offline" banner fires on `navigator.onLine === false`, which only detects total network loss. A user on a captive portal or with a degraded connection will not see this banner. Since this is a local-first app, this banner is arguably unnecessary noise — the app works fine offline by design. Consider replacing it with a subtle sync indicator that shows "all changes saved locally."

---

### 5.4 No Keyboard Navigation on Kanban

The board is not keyboard-accessible. There is a `KeyboardSensor` configured in `BoardView` for dnd-kit, but no visual focus indicators on task cards and no way to open a task detail with the keyboard alone.

---

### 5.5 No Empty State for Dashboard When All Tasks Are Complete

`DashboardView` shows "No Projects Found" when `currentProject` is null, but shows a mostly empty chart + empty task list when all tasks are completed. A celebratory empty state ("All caught up! 🎉") would improve the experience.

---

### 5.6 `BacklogView` Filter State is Not Persisted

Every navigation away from BacklogView resets the filter state (priority, status). This is minor but annoying in daily use.

---

## 6. Security & Data Integrity

### 6.1 No Input Sanitization Before SQLite

Task titles, descriptions, comments, and project names are passed directly to `db.exec()` via `bind` parameters, which is correct (parameterized queries prevent SQL injection). However, **there is no length validation** anywhere. A user can paste a 10MB string into a task title, which will be stored and then potentially cause performance issues on every board render.

**Fix:** Add `maxLength` attributes to all text inputs and validate on the service layer before writing to SQLite.

---

### 6.2 `GEMINI_API_KEY` is Exposed to the Frontend Bundle

```ts
// vite.config.ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```

This inlines the API key into the built JavaScript bundle. Anyone who views source will find the key. For a local-first PWA this may be acceptable (the key is the user's own), but it should be documented clearly and the `.env.example` should include a warning.

---

### 6.3 No Data Export / Backup UI

The app stores all data in IndexedDB. If the user clears browser data, all project information is permanently lost. There is no "Export to JSON" or "Download SQLite backup" feature. For a product positioning itself as "local-first" and respecting "data ownership," this is a significant omission.

---

## 7. Performance

### 7.1 `fetchData()` Called on Every Minor State Change

In `BoardView`, `fetchData()` is called after every drag-end, task creation, and task update. Each call re-queries all tasks for the project and re-renders all columns. For small projects this is fine, but at 200+ tasks it will produce visible lag.

**Fix:** Use optimistic updates. Update local state immediately, write to SQLite in the background, and only re-fetch on error.

---

### 7.2 SQLite WASM Cold Start

The first load initializes SQLite WASM, opens the database, checks for existing data, and potentially runs the seeder. On a cold start this can take 300–800ms before the UI is interactive. The current loading state (`"Initializing Database..."`) is shown but the transition is jarring.

**Fix:** Show a proper splash screen with a progress indicator. Consider pre-warming the WASM module in a Web Worker during the landing/login view so it's ready before the user enters the app.

---

### 7.3 No Virtualization on Task Lists

`BacklogView` and `SprintView` render all tasks as a flat grid/list with no virtualization. For projects with 500+ tasks this will cause significant DOM bloat.

---

## 8. PWA & Service Worker

### 8.1 Service Worker Caches `/index.html` but Not JS/CSS Chunks

`ASSETS_TO_CACHE` in `sw.js` only caches `/`, `/index.html`, and `/manifest.json`. Vite produces hashed JS/CSS bundles (e.g. `assets/index-a3b4c5.js`). These are NOT pre-cached, meaning the app requires a network request for the main bundle on every cold start even when "offline-ready" is claimed.

**Fix:** Use `vite-plugin-pwa` (which is already in `package.json` — just not configured) to auto-generate a precache manifest from the Vite build output, or manually add the asset hashes to the service worker during the build step.

---

### 8.2 Service Worker Version is Hardcoded

```js
const CACHE_NAME = 'project-tracker-v2';
```

Every time assets change, this must be manually bumped. Forgetting to do so means users get stale cached assets. This is exactly the problem `vite-plugin-pwa` solves automatically.

---

### 8.3 `manifest.json` Icons Are External URLs

Both PWA icons point to `lh3.googleusercontent.com`. These will not be available offline. The install prompt may also be rejected by some browsers that validate icon reachability at install time.

**Fix:** Download the icons, place them in `public/icons/`, and reference them as local paths.

---

## 9. Prioritized Roadmap

### 🔴 P0 — Ship-Blockers (Fix Before Any Soft Launch)

1. **Implement missing `db.ts` methods** (`addUser`, `updateUser`, `deleteUser`, `addUserToProject`, `removeUserFromProject`, `getSprints`, `addSprint`) — without these, 4 of 6 main views are broken.
2. **Fix `CalendarView` task creation** — `assigneeId` → `assigneeIds`.
3. **Wire `onDelete`/`onArchive` in `BoardView`** — silent no-ops in the task context menu.
4. **Fix `visibilitychange` persistence** — data can be lost on tab close.
5. **Fix PWA icons to local paths** — offline install will fail.

### 🟠 P1 — High Value, Low Risk (Next Sprint)

6. **Export/Backup UI** — JSON export + SQLite file download. Core to the "data ownership" promise.
7. **Central `useCurrentUser()` context** — eliminate scattered `localStorage` reads.
8. **Error boundaries** — prevent full app crashes from single-view errors.
9. **Mobile search** — search is completely inaccessible on phones.
10. **Fix DashboardView routing** (`currentProject.id` → slugified name).

### 🟡 P2 — Quality of Life (Following Sprint)

11. **Optimistic updates in BoardView** — eliminate full re-fetches on every drag.
12. **`CalendarView` loading state fix** — the stub comment needs a real return.
13. **SQLite WASM warm-up in Web Worker** — faster perceived cold start.
14. **Add `maxLength` validation** to all text inputs.
15. **Activity feed writes** — nothing writes to `activities` after seed; the feed is always empty.
16. **`vite-plugin-pwa` migration** — proper asset pre-caching and SW versioning.
17. **Decompose `TaskDetailModal`** — break into focused sub-components.
18. **Split `db.ts` into domain repositories** — maintainability at scale.

### 🟢 P3 — Feature Expansion (Future Milestones)

19. **AI Planning Coach** (Gemini integration) — task breakdown, sprint planning suggestions.
20. **Encrypted cloud backup** ("Zync" concept from session summary) — WebCrypto + any S3-compatible endpoint the user controls.
21. **Keyboard navigation** — full a11y pass on the Kanban board.
22. **Virtual scrolling** for large task lists.
23. **Sprint burndown chart** — real data, not the mock SVG in DashboardView.
24. **Recurring tasks** — common PM requirement not yet modeled.
25. **Task dependencies** — `blocks`/`blocked_by` relationships in the schema.

---

## 10. Quick Wins (Under 30 Minutes Each)

- Remove `vite` from `dependencies` (keep only in `devDependencies`)
- Remove `vite-plugin-pwa` from `package.json` until it's actually configured, or configure it properly
- Add `import { useState, useEffect } from 'preact/hooks'` to `SprintView` and `TeamView`
- Add `export interface Sprint { ... }` to `db.ts`
- Replace the mock chart SVG in `DashboardView` with real computed data (the data is already fetched)
- Add a `title` attribute to the `<html>` viewport meta — currently only `<title>Project Tracker Pro</title>` is set, which is fine, but an `apple-mobile-web-app-title` meta tag would improve iOS PWA display
- Set `"hasSeenLanding": "true"` in the seeder so returning users skip the landing page on refresh (currently the seeder sets `isLoggedIn` but `showLanding` state re-reads from `localStorage` independently and may conflict)

---

## Appendix: File Health Summary

| File | Lines | Health | Notes |
|---|---|---|---|
| `src/services/db.ts` | ~200 | ⚠️ | Missing 7 methods, fragile persist |
| `src/views/BoardView.tsx` | ~200 | ⚠️ | Delete/archive not wired |
| `src/views/TaskDetailModal.tsx` | ~350 | 🟡 | Works but too large |
| `src/views/CalendarView.tsx` | ~230 | ❌ | Broken task creation, broken loading |
| `src/views/SprintView.tsx` | ~170 | ❌ | db methods missing |
| `src/views/TeamView.tsx` | ~200 | ❌ | db methods missing |
| `src/views/ProjectSettingsView.tsx` | ~330 | ❌ | db methods missing |
| `src/views/ProfileSettingsView.tsx` | ~130 | ❌ | db methods missing |
| `src/views/DashboardView.tsx` | ~200 | 🟡 | Broken route call, mock chart |
| `src/views/BacklogView.tsx` | ~110 | ✅ | Clean, works as designed |
| `src/App.tsx` | ~170 | 🟡 | Dual source of truth for routing |
| `src/components/Navigation.tsx` | ~230 | ✅ | Clean |
| `src/services/seeder.ts` | ~80 | ✅ | Clean |
| `public/sw.js` | ~90 | ⚠️ | Doesn't cache JS/CSS assets |
| `vite.config.ts` | ~40 | ✅ | Clean |

Legend: ✅ Good · 🟡 Minor issues · ⚠️ Significant issues · ❌ Broken at runtime
