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
> **Goal:** Eliminate every runtime crash. Align the entire codebase with the `project_members` db model introduced in the db refactor. Every navigation view must render without errors before Phase 1 begins.  
> **Target:** Before any public or team demo.

---

### 🔴 DB Layer — Stale Table References in `db.ts`

The `addProject()` and `manualSeed()` methods still reference `project_users` and `users`, which no longer exist in the schema. Both throw a SQLite "no such table" error at runtime.

- [x] `src/services/db.ts` `addProject()` method — `INSERT INTO project_users (project_id, user_id, role)` block → remove the entire block (lines containing `myId` and the `project_users` INSERT); project membership will be established in Phase 1 via `addProjectMember()`
- [x] `src/services/db.ts` `manualSeed()` method — `DELETE FROM project_users; DELETE FROM projects; DELETE FROM users;` exec string → remove `DELETE FROM project_users;` and `DELETE FROM users;` from the string, keep only `DELETE FROM columns; DELETE FROM tasks; DELETE FROM activities; DELETE FROM subtasks; DELETE FROM comments; DELETE FROM project_members;`

---

### 🔴 DB Layer — Missing Sprint Methods and Interface

`SprintView` imports `Sprint` from `db.ts` (does not exist) and calls `db.getSprints()` and `db.addSprint()` (do not exist). The view crashes on load.

- [x] `src/services/db.ts` after the `ProjectMember` interface — add `export interface Sprint { id: string; projectId: string; name: string; startDate: string; endDate: string; status: 'planned' | 'active' | 'completed' }` 
- [x] `src/services/db.ts` after the `addActivity()` method — add `async getSprints(projectId: string): Promise<Sprint[]>` querying `SELECT * FROM sprints WHERE project_id = ? ORDER BY start_date ASC`
- [x] `src/services/db.ts` after `getSprints()` — add `async addSprint(sprint: Omit<Sprint, 'id'>): Promise<string>` inserting into the `sprints` table with a generated id
- [x] `src/services/db.ts` `persist()` tables array — `['projects', 'columns', 'project_members', 'tasks', ...]` → add `'sprints'` to the array
- [x] `src/services/db.ts` `init()` restore loop — add `'sprints'` to the tables iterated when restoring from IndexedDB

---

### 🔴 Seeder — Inserts into Deleted Tables, Crashes Fresh Install

`seeder.ts` inserts into `users` and `project_users` (both deleted). On a fresh install `performSeed()` is called during `db.init()`, throws, and leaves the app with no data.

- [x] `src/services/seedData.ts` — `export const SEED_USERS` array and its `User` type import → delete the entire `SEED_USERS` export and the `User` import at the top of the file
- [x] `src/services/seedData.ts` — every object in `SEED_TASKS` has `assigneeType: 'me' | 'team' | 'none'` field → remove `assigneeType` from all 9 task objects in the array
- [x] `src/services/seeder.ts` — `import { SEED_USERS, ... }` line → remove `SEED_USERS` from the import destructure
- [x] `src/services/seeder.ts` — `INSERT OR IGNORE INTO users ...` exec block and `INSERT INTO project_users ...` exec block → delete both blocks entirely
- [x] `src/services/seeder.ts` — `const otherUserIds: string[] = []` variable and all code that builds or iterates it → delete the variable declaration and the `for (const u of SEED_USERS)` loop
- [x] `src/services/seeder.ts` — `const myUserId = localStorage.getItem('myUserId') || 'me'` and the `INSERT OR IGNORE INTO users` "Me" bootstrap block → delete both lines/block
- [x] `src/services/seeder.ts` — `let tAssignees: string[] = []` and the `if (t.assigneeType === 'me')` / `else if` block → delete; replace `tAssignees.join(',')` in the task INSERT bind with `''` (empty string)
- [x] `src/main.tsx` — `if (!localStorage.getItem('myUserId')) { localStorage.setItem('myUserId', 'me'); }` block → delete the entire if block

---

### 🔴 App.tsx — Deleted `User` Type, Deleted `db.getUsers()`, Broken `refreshUser()`

`App.tsx` imports the deleted `User` type, calls the deleted `db.getUsers()`, and passes a broken `currentUser: User | null` state to `Sidebar` and `Navbar`. The entire nav identity display is non-functional.

- [x] `src/App.tsx` — `import { db, Project, User } from './services/db'` → remove `User` from the import; change to `import { db, Project } from './services/db'`
- [x] `src/App.tsx` — `const [currentUser, setCurrentUser] = useState<User | null>(null)` state declaration → delete the state declaration
- [x] `src/App.tsx` — `const refreshUser = async () => { ... }` function (all ~10 lines) → delete the entire function
- [x] `src/App.tsx` — `await refreshUser()` call inside `initDb()` → delete this line
- [x] `src/App.tsx` — `const handleProfileUpdate = () => refreshUser()` and `window.addEventListener('profileUpdated', handleProfileUpdate)` and its cleanup → delete all three lines
- [x] `src/App.tsx` — `currentUser={currentUser}` prop on `<Sidebar>` and `<Navbar>` → remove the prop from both JSX elements

---

### 🔴 Navigation.tsx — Deleted `User` Type in Props

`Navigation.tsx` imports the deleted `User` type and uses it in `SidebarProps` and the `Navbar` function signature. Both components crash to TypeScript errors and render broken identity sections.

- [x] `src/components/Navigation.tsx` line ~5 — `import { Project, User } from '../services/db'` → remove `User` from the import; change to `import { Project } from '../services/db'`
- [x] `src/components/Navigation.tsx` `SidebarProps` interface — `currentUser: User | null` field → replace with `ownerName?: string` and `ownerPhotoUrl?: string`
- [x] `src/components/Navigation.tsx` `Sidebar` component body — avatar/name block in the footer that reads `currentUser?.initials` and `currentUser?.name` → replace with `<p className="text-sm text-app-text-secondary">Sign in to see your profile</p>` static placeholder
- [x] `src/components/Navigation.tsx` `Navbar` function signature — `currentUser: User | null` parameter → remove; remove all `currentUser?.` references in the Navbar body; replace the avatar with `<div className="size-6 rounded-full bg-primary/20" />`

---

### 🔴 Views — Calls to Deleted `db.getProjectTeam()` and `db.getUsers()`

Five views and one component call methods deleted in the db refactor. Each throws an unhandled rejection on mount.

- [x] `src/views/BacklogView.tsx` line ~19 — `db.getProjectTeam(currentProject.id)` in `fetchData()` → replace with `db.getProjectMembers(currentProject.id)`; update `setUsers` state type from `User[]` to `ProjectMember[]`; update the `User` import to `ProjectMember`
- [x] `src/views/BoardView.tsx` line ~24 — `db.getProjectTeam(currentProject.id)` in `fetchData()` → replace with `db.getProjectMembers(currentProject.id)`; update `users` state type from `User[]` to `ProjectMember[]`; update all `User` imports to `ProjectMember`
- [x] `src/views/DashboardView.tsx` line ~45 — `db.getUsers()` in `fetchData()` → remove this call and remove `setUsers` / `users` state entirely; remove the `User` import; the activity feed avatar currently maps `activity.userId` against `users` — replace with a static `<div className="size-6 rounded-full bg-primary/20" />` placeholder until Phase 1 wires real member data
- [x] `src/components/TaskDetailModal.tsx` line ~78 — `db.getProjectTeam(task.projectId)` in `fetchData()` → replace with `db.getProjectMembers(task.projectId)`; update `team` state type from `User[]` to `ProjectMember[]`; update all avatar renders from `u.initials`/`u.avatarUrl` to `m.displayName`/`m.photoUrl`; remove `User` import, add `ProjectMember` import
- [x] `src/views/TeamView.tsx` — entire component body calls `db.getProjectTeam()`, `db.getUsers()`, `db.addUser()`, `db.addUserToProject()`, `db.removeUserFromProject()` → gut the component; replace body with `<div className="flex-1 flex items-center justify-center p-10"><p className="text-app-text-secondary">Team management available after sign-in.</p></div>`; keep the file
- [x] `src/views/ProfileSettingsView.tsx` — entire component calls `db.getUsers()`, `db.addUser()`, `db.updateUser()` → gut the component; replace body with `<div className="flex-1 flex items-center justify-center p-10"><p className="text-app-text-secondary">Profile available after sign-in.</p></div>`; keep the file
- [x] `src/views/ProjectSettingsView.tsx` — `fetchTeam()` function and all code that calls `db.getProjectTeam()`, `db.getUsers()`, `db.addUserToProject()`, `db.removeUserFromProject()`, `db.deleteUser()` → remove the entire Team Management UI section (member grid, modals, `isAddUserModalOpen`, `isCreateUserModalOpen`, `team`, `allUsers` state, `fetchTeam`, `handleAddUser`, `handleRemoveUser`, `handleCreateUser`, `handleDeleteUserGlobally`); keep General Information, Visual Identity, Sprint Configuration sections

---

### 🔴 Views — Broken `TaskForm` and `TaskCard` with Deleted `User` Type

`TaskForm` accepts `users?: User[]` which references the deleted type. `BoardView` passes `usersData` (now `ProjectMember[]`) as `users` to `TaskForm`, causing a type mismatch.

- [x] `src/components/TaskForm.tsx` — `import { Priority, User } from '../services/db'` → remove `User` from import; change to `import { Priority, ProjectMember } from '../services/db'`
- [x] `src/components/TaskForm.tsx` `TaskFormProps` interface — `users?: User[]` → change to `users?: ProjectMember[]`
- [x] `src/components/TaskForm.tsx` — avatar pill in the assignees section reads `u.initials`/`u.avatarUrl` → replace with `u.displayName`/`u.photoUrl`; update `<Avatar>` call to pass `displayName={u.displayName}` and `photoUrl={u.photoUrl}`
- [x] `src/views/BoardView.tsx` — `usersData` returned by `db.getProjectMembers()` now typed `ProjectMember[]`; the `users` prop passed to `<TaskForm>` must match → verify the prop type aligns after the `TaskForm` change above; no code change needed if types are consistent

---

### 🔴 Avatar Component — Decouple from Deleted `User` Props

`Avatar.tsx` uses `initials` and `src` props, tightly coupling it to the old `User` model. All call sites need updating for the new `displayName`/`photoUrl` shape from `ProjectMember`.

- [x] `src/components/Avatar.tsx` `AvatarProps` interface — `src?: string` and `initials?: string` → replace with `displayName: string` and `photoUrl?: string`
- [x] `src/components/Avatar.tsx` render body — `{src ? <img ...> : <span>{initials}</span>}` → derive initials internally: `const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)`; render `{photoUrl ? <img src={photoUrl} ...> : <span>{initials}</span>}`
- [x] `src/components/TaskCard.tsx` — `assignees?: { src?: string; initials?: string }[]` prop type → change to `assignees?: { displayName: string; photoUrl?: string }[]`; update the avatar stack render to pass `displayName` and `photoUrl`
- [x] `src/views/BoardView.tsx` `SortableTaskCard` — `assignees` mapped as `{ initials: u.initials, src: u.avatarUrl }` → change to `{ displayName: u.displayName, photoUrl: u.photoUrl ?? undefined }`
- [x] `src/components/TaskDetailModal.tsx` — all `<Avatar initials={...} src={...}>` calls → change to `<Avatar displayName={...} photoUrl={...}>`
- [x] `src/views/StorybookView.tsx` — `<Avatar initials="JD" />` and `<Avatar initials="AS" size="lg" />` etc. → change to `<Avatar displayName="John Doe" />` etc.

---

### 🔴 Bug Fixes — Broken View Logic

- [x] `src/views/CalendarView.tsx` `handleAddTask()` object literal — `assigneeId: myUserId || undefined` field (singular, non-existent on `Task`) → remove the `assigneeId` field entirely; tasks created from calendar will be unassigned
- [x] `src/views/CalendarView.tsx` lines ~95–98 — `if (loading) { // ... (rest of loading check) }` → replace the comment stub body with `return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;`
- [x] `src/views/BoardView.tsx` `SortableTaskCard` `<TaskCard>` JSX — `onDelete` and `onArchive` props are missing → add `onDelete={async (e) => { e.stopPropagation(); await db.deleteTask(task.id); fetchData(); }}` and `onArchive={async (e) => { e.stopPropagation(); await db.updateTask(task.id, { isArchived: true }); fetchData(); }}`; pass `fetchData` as a prop or lift it
- [x] `src/views/DashboardView.tsx` line ~145 — `route('/project/${currentProject.id}/board')` → replace `currentProject.id` with `slugify(currentProject.name)`; add `const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '_')` if not already in scope

---

### 🔴 Data Safety — Async Persistence Race Condition

`beforeunload` is called with an async `persist()` that the browser does not await. Data written in the last 2 seconds before tab close is silently lost.

- [x] `src/services/db.ts` `init()` — `window.addEventListener('beforeunload', () => this.persist())` → add before it: `document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && this.isDirty) this.persist(); });`; keep the `beforeunload` listener as a secondary fire-and-hope fallback
- [x] `src/services/db.ts` `DatabaseService` class — add `private isDirty = false` field after `private persistTimeout`
- [x] `src/services/db.ts` `schedulePersist()` method — `if (this.persistTimeout) clearTimeout(...)` line → add `this.isDirty = true;` before the timeout assignment
- [x] `src/services/db.ts` `persist()` method — `await this.storage.writeAllTables(data)` call → add `this.isDirty = false;` on the line immediately after

---

### 🔴 PWA — Offline Install Failure

Both PWA icons reference an external Google CDN URL. The service worker does not cache these. Offline installs fail.

- [x] `public/manifest.json` — both `"src"` fields pointing to `lh3.googleusercontent.com` → change first to `/icons/icon-192.png` and second to `/icons/icon-512.png`; download or create placeholder icons and save to `public/icons/` directory
- [x] `index.html` — `<link rel="apple-touch-icon" href="https://lh3.googleusercontent.com/...">` → change `href` to `/icons/icon-192.png`

---

### ⚡ Quick Wins — Fix in One Sitting

- [x] `src/views/TeamView.tsx` line ~2 — missing `useState` and `useEffect` imports → add `import { useState, useEffect } from 'preact/hooks'`
- [x] `src/views/SprintView.tsx` line ~2 — missing `useState` and `useEffect` imports → add `import { useState, useEffect } from 'preact/hooks'`
- [x] `package.json` `dependencies` — `"vite": "^6.2.0"` duplicate entry → remove `vite` from `dependencies`; keep only in `devDependencies`
- [x] `package.json` `dependencies` — `"vite-plugin-pwa": "^0.21.1"` not installed and not used → remove entry; re-add in Phase 2 when properly configured
- [x] `index.html` `<head>` — missing iOS PWA title meta → add `<meta name="apple-mobile-web-app-title" content="TrackerPro" />`
- [x] `src/services/seeder.ts` near the end — `localStorage.setItem('isLoggedIn', 'true')` present but `localStorage.setItem('hasSeenLanding', 'true')` missing → add `localStorage.setItem('hasSeenLanding', 'true')` on the line below

---

### 🔴 Phase 0 Verification

- [ ] Run `tsc --noEmit` — zero errors relating to `User`, `getUsers`, `getProjectTeam`, `addUser`, `updateUser`, `deleteUser`, `addUserToProject`, `removeUserFromProject`
- [ ] Run `npm run seed` (or `npm run dev` fresh) — confirm seeder executes without SQLite errors and the app boots with data
- [ ] Open every navigation view in the browser — confirm no console errors on `ProfileSettingsView` stub, `TeamView` stub, `ProjectSettingsView`, `BoardView`, `BacklogView`, `DashboardView`, `CalendarView`, `SprintView`
- [ ] Open a task detail modal — confirm subtasks, comments, and assignees panel render without errors (empty state is acceptable)
- [ ] Drag a task in the board — confirm drag-and-drop works and delete/archive buttons fire correctly
- [ ] Close the tab within 1 second of creating a task — reopen and confirm the task is still present

---

## Phase 1 — Core Product Promises
> **Goal:** Implement real Firebase authentication, rebuild project membership on real auth identities, restore the full assignee UI, and deliver the remaining core product promises.  
> **Target:** End of Sprint 1 after Phase 0.

---

### 🟠 Authentication — Firebase with Decoupled Provider Adapter

The `AuthProvider` interface decouples Firebase from the rest of the app. Swapping providers requires changing one adapter file.

- [ ] `src/auth/AuthProvider.ts` — does not exist → create file; export `interface AuthUser { uid: string; displayName: string; email: string | null; photoUrl: string | null }` and `interface AuthProvider { onAuthStateChanged(cb): () => void; signInWithGoogle(): Promise<AuthUser>; signOut(): Promise<void>; getCurrentUser(): AuthUser | null }`
- [ ] `src/auth/getAuthProvider.ts` — does not exist → create file; export singleton `initAuth(provider: AuthProvider): void` and `getAuthProvider(): AuthProvider`
- [ ] `src/auth/index.ts` — does not exist → create file; re-export `AuthUser`, `AuthProvider`, `initAuth`, `getAuthProvider`
- [ ] `src/auth/adapters/FirebaseAuthAdapter.ts` — does not exist → create file; implement `createFirebaseAuthAdapter(): AuthProvider`; this is the ONLY file in the project that may import from `'firebase'`
- [ ] `.env.example` — missing Firebase env vars → add `VITE_FIREBASE_API_KEY=`, `VITE_FIREBASE_AUTH_DOMAIN=`, `VITE_FIREBASE_PROJECT_ID=` with comments
- [ ] `src/main.tsx` — `render(<App />, ...)` call → add `import { initAuth } from './auth'` and `import { createFirebaseAuthAdapter } from './auth/adapters/FirebaseAuthAdapter'`; call `initAuth(createFirebaseAuthAdapter())` before `render()`
- [ ] `src/context/AuthContext.tsx` — does not exist → create file; export `<AuthProvider>` component and `useAuth()` hook returning `{ user: AuthUser | null, isLoading: boolean, signInWithGoogle, signOut }`
- [ ] `src/main.tsx` — `<App />` in `render()` call → wrap with `<AuthProvider>`

---

### 🟠 Authentication — Wire Auth into App and Login Flow

- [ ] `src/App.tsx` — `isLoggedIn` state and `localStorage.getItem('isLoggedIn')` → replace with `const { user, isLoading } = useAuth()`; show `<LoginView>` when `!user && !isLoading`; show `<LandingView>` when `!user && !isLoading && !hasSeenLanding`
- [ ] `src/views/LoginView.tsx` — `setTimeout` fake login → replace with `const { signInWithGoogle } = useAuth()`; remove fake email/password fields; keep only a Google sign-in button; show `<Loader2>` while `isLoading`

---

### 🟠 Project Member Sync at Sign-In

- [ ] `src/App.tsx` — after `db.init()` resolves and `user` is non-null → add `await db.addProjectMember(currentProjectId, user.uid, user.displayName, user.photoUrl)` call; the `UNIQUE (project_id, auth_uid)` constraint makes this idempotent

---

### 🟠 Replace All Remaining `localStorage.getItem('myUserId')` Reads

- [ ] `src/services/db.ts` `addTask()` method — `const myId = localStorage.getItem('myUserId')` line and `finalAids` fallback to `myId` → the task creation default assignee logic should be removed from the service layer; callers should pass `assigneeIds` explicitly or pass `[]`
- [ ] `src/components/TaskDetailModal.tsx` — `const myId = localStorage.getItem('myUserId') || 'me'` in `handleAddComment()` → replace with `const { user } = useAuth(); const myId = user?.uid`
- [ ] `src/components/TaskForm.tsx` — `const myId = localStorage.getItem('myUserId')` in `useState` initializer → replace with `const { user } = useAuth(); ... return user?.uid ? [user.uid] : []`

---

### 🟠 Rebuild Navigation with Real Auth Identity

- [ ] `src/components/Navigation.tsx` `Sidebar` footer section — static placeholder added in Phase 0 → replace with `const { user, signOut } = useAuth()`; render `<Avatar displayName={user.displayName} photoUrl={user.photoUrl ?? undefined} />` and user name; wire the logout button to `signOut()`
- [ ] `src/components/Navigation.tsx` `Navbar` user section — static placeholder → replace with `const { user } = useAuth()`; render `<Avatar displayName={user?.displayName ?? 'Guest'} photoUrl={user?.photoUrl ?? undefined} size="sm" />`

---

### 🟠 Rebuild `TeamView` with Real `project_members` Data

- [ ] `src/views/TeamView.tsx` — Phase 0 placeholder body → replace with full implementation calling `db.getProjectMembers(currentProject.id)`; render each member as a card with `<Avatar displayName={m.displayName} photoUrl={m.photoUrl ?? undefined} />` + display name + role; allow the owner (`role === 'owner'`) to call `db.removeProjectMember(projectId, m.authUid)` via a remove button

---

### 🟠 Rebuild `ProfileView` Against Auth

- [ ] `src/views/ProfileSettingsView.tsx` — Phase 0 placeholder body → replace with a view that reads from `const { user, signOut } = useAuth()`; display `user.displayName`, `user.email`, `user.photoUrl`; provide a Sign Out button wired to `signOut()`; profile data is read-only (managed by the identity provider)

---

### 🟠 Restore Full Assignee UI in `TaskForm` and `TaskDetailModal`

With `project_members` populated by real sign-ins, restore what was simplified in Phase 0.

- [ ] `src/components/TaskForm.tsx` — assignees section currently renders `ProjectMember[]` passed as `users` prop → verify call in `BoardView` passes `db.getProjectMembers()` result; confirm pill toggles render `m.displayName` correctly
- [ ] `src/components/TaskDetailModal.tsx` — assignees panel currently uses `ProjectMember[]` from `db.getProjectMembers()` → verify the Add Assignee modal renders correctly; confirm toggling assignees calls `db.updateTask(id, { assigneeIds: [...] })`
- [ ] `src/views/BoardView.tsx` `SortableTaskCard` — avatar stack maps `task.assigneeIds` against `users` (now `ProjectMember[]`) to get `displayName`/`photoUrl` → verify the map uses `m.authUid` for the lookup key, not `m.id`

---

### 🟠 Data Export & Backup

- [ ] `src/views/ProjectSettingsView.tsx` — after the Sprint Configuration section → add an Export section with a "Download JSON" button that serializes tasks, columns, members, comments, subtasks for `currentProject` into a `.json` blob and triggers a download
- [ ] `src/views/ProjectSettingsView.tsx` — after the JSON export button → add a "Download SQLite Backup" button that reads the raw IndexedDB blob and triggers a `.db` file download
- [ ] `src/views/ProjectSettingsView.tsx` — below backup buttons → add a data-age warning: "Last backup: X days ago" derived from a `lastBackupAt` localStorage key updated on each export

---

### 🟠 Error Boundaries — Prevent Full App Crashes

- [ ] `src/components/ErrorBoundary.tsx` — does not exist → create as a Preact class component with `componentDidCatch` and a fallback UI ("Something went wrong — tap to retry" + retry button that calls `window.location.reload()`)
- [ ] `src/App.tsx` — `<Route path=".../board" component={BoardView} ...>` → wrap `BoardView` with `<ErrorBoundary>`
- [ ] `src/App.tsx` — `<Route path=".../sprints" component={SprintView} ...>` → wrap with `<ErrorBoundary>`
- [ ] `src/App.tsx` — `<Route path=".../team" component={TeamView} ...>` → wrap with `<ErrorBoundary>`
- [ ] `src/App.tsx` — `<Route path=".../settings" component={ProjectSettingsView} ...>` → wrap with `<ErrorBoundary>`
- [ ] `src/App.tsx` or `src/main.tsx` — add `window.onerror` and `window.onunhandledrejection` handlers that log errors and show a non-intrusive toast notification

---

### 🟠 Mobile Search

- [ ] `src/components/Navigation.tsx` `BottomNav` — four nav icons with no search entry point → add a Search icon button as a fifth tab item that opens a `SearchOverlay`
- [ ] `src/views/SearchOverlay.tsx` — does not exist → create a full-screen modal component that accepts `searchQuery` state and `onClose`; renders a search input wired to the existing `searchQuery` prop
- [ ] `src/App.tsx` — add `isSearchOpen` state; pass `onSearchOpen` to `BottomNav`; render `<SearchOverlay>` conditionally

---

### 🟠 Activity Feed — Always Empty After Seed

- [ ] `src/services/db.ts` `addTask()` method — after the INSERT exec → add `this.addActivity({ projectId: t.projectId, taskId: id, type: 'task_created', content: 'created task ' + t.title })`
- [ ] `src/services/db.ts` `updateTask()` method — after the UPDATE exec → add `this.addActivity({ projectId: ..., taskId: id, type: 'task_updated', content: 'updated task' })` (derive projectId from a SELECT before the update if not passed)
- [ ] `src/services/db.ts` `deleteTask()` method — before the DELETE exec → fetch the task's `projectId` with a SELECT; call `this.addActivity({ projectId, taskId: id, type: 'task_deleted', content: 'deleted a task' })`
- [ ] `src/services/db.ts` `addComment()` method — after the INSERT → call `this.addActivity({ projectId: ..., taskId, type: 'comment_added', content: 'commented on a task' })`
- [ ] `src/views/DashboardView.tsx` — activity feed card currently maps `activity.userId` against a deleted `users` array → after Phase 1 member sync, resolve `actorUid` against `db.getProjectMembers()` to display `displayName` + avatar

---

## Phase 2 — Quality & Reliability
> **Goal:** Make the codebase robust enough to extend safely. Fix the architecture issues that compound with every new feature.  
> **Target:** Sprint 2 after Phase 1.

---

### 🟡 Routing — Single Source of Truth for Current Project

- [ ] `src/App.tsx` — `const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)` declaration → remove the state declaration
- [ ] `src/App.tsx` — `const currentProject = projects.find(p => p.id === currentProjectId) || null` → replace with `const currentProject = useMemo(() => { const match = window.location.pathname.match(/\/project\/([^/]+)/); if (!match) return projects[0] || null; return projects.find(p => slugify(p.name) === match[1]) || null; }, [projects, window.location.pathname])`
- [ ] `src/App.tsx` — `handleRouteChange` function and `window.addEventListener('popstate', handleRouteChange)` and its cleanup → delete all three; routing is now derived from pathname

---

### 🟡 Persistence — Schema Versioning and Migration Safety

- [ ] `src/services/db.ts` `IndexedDBStorage` class — `private dbName = 'project_tracker_v5_tables'` → change to `'project_tracker_v6_tables'` to force a clean restore after the schema migration
- [ ] `src/services/db.ts` after `IndexedDBStorage` class — add `const SCHEMA_VERSION = 1` constant
- [ ] `src/services/db.ts` `persist()` method — after `writeAllTables()` call → add `await this.storage.set('schema_version', SCHEMA_VERSION)`
- [ ] `src/services/db.ts` `init()` — before the `createTables()` call → add a version check and `migrateSchema(fromVersion)` stub that handles future column additions gracefully
- [ ] `src/services/db.ts` — add `private runSql(sql: string, bind?: any[])` wrapper around `this.db.exec()` that catches errors and logs them with the SQL and bind values in development mode

---

### 🟡 Type Safety — Eliminate `any` in DB Row Callbacks and Enable Strict Mode

- [ ] `tsconfig.json` — `"compilerOptions"` object → add `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noImplicitReturns": true`
- [ ] `src/services/db.ts` — all `callback: (r: any[]) => ...` row callbacks → define a typed tuple per table (e.g. `type ProjectRow = [string, string, string, string, string, string, number, number, string]`) and replace `r: any[]` with the typed tuple; use named destructuring
- [ ] `src/services/db.ts` — `addTask(t: any)`, `updateTask(id: string, u: any)`, `addProject(p: any)` signatures → replace `any` with explicit typed parameter interfaces

---

### 🟡 Code Organisation — Decompose `TaskDetailModal`

- [ ] `src/components/TaskDetailModal/TaskHeader.tsx` — does not exist → extract title, completion button, priority badge from `TaskDetailModal`
- [ ] `src/components/TaskDetailModal/SubtaskList.tsx` — does not exist → extract subtask CRUD + linked progress logic
- [ ] `src/components/TaskDetailModal/CommentThread.tsx` — does not exist → extract comment list + add comment modal
- [ ] `src/components/TaskDetailModal/AssigneePanel.tsx` — does not exist → extract assignee pills + add assignee modal; reads `ProjectMember[]`
- [ ] `src/components/TaskDetailModal/TimeTracker.tsx` — does not exist → extract elapsed display + start/stop button
- [ ] `src/components/TaskDetailModal/TaskMetaPanel.tsx` — does not exist → extract due date, priority editor, progress bar sidebar
- [ ] `src/components/TaskDetailModal.tsx` — 350-line monolith → replace body with a thin layout shell composing the six extracted sub-components

---

### 🟡 Code Organisation — Split `db.ts` into Domain Repositories

- [ ] `src/services/repos/projectRepo.ts` — does not exist → extract `getProjects`, `getProjectByName`, `addProject`, `updateProject`, `deleteProject`
- [ ] `src/services/repos/taskRepo.ts` — does not exist → extract `getTasks`, `addTask`, `updateTask`, `updateTaskColumn`, `deleteTask`
- [ ] `src/services/repos/sprintRepo.ts` — does not exist → extract `getSprints`, `addSprint`
- [ ] `src/services/repos/memberRepo.ts` — does not exist → extract `getProjectMembers`, `addProjectMember`, `removeProjectMember`
- [ ] `src/services/repos/activityRepo.ts` — does not exist → extract `getComments`, `addComment`, `getSubtasks`, `addSubtask`, `updateSubtask`, `deleteSubtask`, `getActivities`, `addActivity`, `startTaskTimer`, `stopTaskTimer`
- [ ] `src/services/db.ts` — 280-line class → keep as entry point that imports all repos, composes them into a single `db` export, retains `init()`, `createTables()`, `persist()`, and `schedulePersist()`

---

### 🟡 Performance — Optimistic Updates in `BoardView`

- [ ] `src/views/BoardView.tsx` `handleDragEnd()` — `await db.updateTaskColumn(taskId, overId); await fetchData()` → update `tasks` state immediately with the new `columnId` before the DB write; call `db.updateTaskColumn()` in the background; on error, revert state and show a toast
- [ ] `src/views/BoardView.tsx` `handleAddTask()` — `await db.addTask(...); await fetchData()` → append the new task optimistically to local state before the DB write resolves

---

### 🟡 PWA — Proper Asset Pre-caching

- [ ] `package.json` `dependencies` — `"vite-plugin-pwa"` was removed in Phase 0 quick wins → re-add as a `devDependency` and install: `npm install -D vite-plugin-pwa`
- [ ] `vite.config.ts` — `plugins: [preact(), tailwindcss(), wasm(), topLevelAwait()]` → add `VitePWA({ registerType: 'autoUpdate', workbox: { globPatterns: ['**/*.{js,css,html,wasm}'] } })` to the plugins array
- [ ] `public/sw.js` — hand-rolled service worker → delete the file after confirming `vite-plugin-pwa` generates a replacement during `npm run build`
- [ ] After migration: run `npm run build` and verify `dist/sw.js` is generated and `dist/manifest.webmanifest` contains the correct icon paths

---

### 🟡 Security — API Key Off Client Bundle

- [ ] `src/services/geminiProxy.ts` — does not exist → create an Express route in the existing server that accepts task data and proxies the Gemini API call; read `GEMINI_API_KEY` from `process.env` server-side only
- [ ] `vite.config.ts` — `define: { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) }` → remove the `define` block entirely; the key is no longer needed in the client bundle
- [ ] `.env.example` — add `# WARNING: Never use VITE_* prefix for the Gemini key — it would embed in the browser bundle. This key is server-side only.` comment above the `GEMINI_API_KEY` line

---

### 🟡 Input Validation

- [ ] `src/components/TaskForm.tsx` — task title `<input>` element → add `maxLength={200}` attribute
- [ ] `src/components/TaskForm.tsx` — description `<textarea>` element → add `maxLength={2000}` attribute
- [ ] `src/components/TaskDetailModal.tsx` — subtask title input and comment textarea → add `maxLength={200}` and `maxLength={500}` respectively
- [ ] `src/components/ProjectForm.tsx` — project name `<input>` → add `maxLength={100}` attribute
- [ ] `src/services/db.ts` `addTask()` and `updateTask()` — after the parameter check → add trim + length guard: `if (t.title && t.title.trim().length > 200) throw new Error('Task title exceeds 200 characters')`

---

### 🟡 Toolchain — Linter, Formatter, Git Hooks

- [ ] `package.json` scripts — no `lint` script beyond `tsc --noEmit` → install ESLint with TypeScript and React Hooks plugins; create `eslint.config.js`; add `"lint": "eslint src --ext .ts,.tsx --max-warnings 0"` script
- [ ] `package.json` — no Prettier → install Prettier + `eslint-config-prettier`; create `.prettierrc`; add `"format"` and `"format:check"` scripts
- [ ] `package.json` scripts — add `"check": "tsc --noEmit && npm run lint && npm run format:check"` unified quality gate
- [ ] `package.json` — no Husky → install Husky + lint-staged; configure `pre-commit` hook; configure `lint-staged` to run eslint + prettier on staged `src/**/*.{ts,tsx}`
- [ ] `package.json` — no commitlint → install `@commitlint/config-conventional`; configure `commit-msg` hook

---

## Phase 3 — Feature Expansion
> **Goal:** Build the features that differentiate the product once the foundation is solid.  
> **Target:** After Phases 0–2 are stable.

---

### 🟢 Dashboard — Real Data Charts

- [ ] `src/views/DashboardView.tsx` — decorative SVG wave path → replace with a real task completion over time line chart using the `activities` table; compute completions per day from `activities` with `type = 'task_completed'`
- [ ] `src/views/DashboardView.tsx` — stat cards area → add a task distribution by priority donut chart (count of high/medium/low across all non-archived tasks)
- [ ] `src/views/DashboardView.tsx` — "No Projects Found" empty state → add an additional all-tasks-complete state: when `activeTasks.length === 0 && totalTasks > 0` render `<div>You're all caught up! 🎉</div>`

---

### 🟢 Sprint Burndown Chart

- [ ] `src/views/SprintView.tsx` — sprint card "view details" button currently calls `alert()` → navigate to a `SprintDetailView` route
- [ ] `src/views/SprintDetailView.tsx` — does not exist → create view showing sprint tasks in a filtered Kanban + a burndown chart (remaining tasks by day over sprint duration)
- [ ] `src/services/db.ts` or `sprintRepo.ts` — add `getSprintTasks(sprintId: string): Promise<Task[]>` querying tasks with `sprint_id = ?`

---

### 🟢 AI Planning Coach (Gemini via Server Proxy)

- [ ] `src/components/TaskDetailModal/AIAssist.tsx` — does not exist → add a floating "AI Assist" button; send task title + description to the Gemini proxy endpoint; stream back suggested subtasks
- [ ] `src/views/SprintView.tsx` — sprint creation modal → add "Generate Sprint Plan" button that calls Gemini with current backlog task titles and priorities
- [ ] `src/views/DashboardView.tsx` — activity area → add "Daily Standup Summary" button that calls Gemini with yesterday's completions and today's in-progress tasks

---

### 🟢 Encrypted Cloud Backup ("Zync")

- [ ] `src/views/ProjectSettingsView.tsx` — after Phase 1 backup section → add Zync settings UI: endpoint URL, bucket/path, access key fields stored in `localStorage`
- [ ] `src/services/zyncService.ts` — does not exist → implement WebCrypto AES-GCM encryption of the SQLite export blob before upload; implement upload to any S3-compatible endpoint
- [ ] `src/services/zyncService.ts` — add download + decrypt + restore flow
- [ ] `src/components/Navigation.tsx` `Navbar` — right side → add a background sync status indicator driven by `zyncService` last-sync timestamp

---

### 🟢 Task Dependencies

- [ ] `src/services/db.ts` `createTables()` tasks table — `CREATE TABLE IF NOT EXISTS tasks (...)` statement → add `blocks TEXT DEFAULT ''` and `blocked_by TEXT DEFAULT ''` columns (comma-separated task IDs); add a schema migration step in Phase 2's `migrateSchema()`
- [ ] `src/components/TaskDetailModal/TaskHeader.tsx` — after the priority badge → add a Dependencies section with add/remove UI
- [ ] `src/components/TaskCard.tsx` — card body → show a 🔴 blocked indicator when `task.blockedBy` contains unresolved task IDs
- [ ] `src/services/db.ts` `updateTaskColumn()` method — before the UPDATE → query `blocked_by` tasks; if any are not in the "Done" column, reject the move to "Done" and throw with a user-visible message

---

### 🟢 Accessibility — Full Keyboard Navigation on Kanban

- [ ] `src/views/BoardView.tsx` — all task card containers have `outline-none` → add visible focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- [ ] `src/views/BoardView.tsx` — add keyboard shortcuts: `N` = new task in focused column, `Enter` = open detail modal, `Delete` = delete selected task; wire to a `useKeyboard` hook
- [ ] `src/views/BoardView.tsx` `DndContext` — `KeyboardSensor` is already registered → wire ARIA live region announcements for drag start, drag over column, drag end

---

## Ongoing / Evergreen Tasks

These have no single completion point — revisit every sprint.

- [ ] **`npm run check` in CI** — the unified gate (tsc + eslint + prettier check) must pass on every PR before merge; set up once in Phase 2, enforce forever
- [ ] **Integration test per new `db.ts` method** — the persistence layer has zero test coverage; add at minimum a happy-path test for every new public method
- [ ] **Performance budget** — after each feature addition, measure board render time with 100 tasks; keep under 100ms on a mid-range device
- [ ] **Accessibility audit** — run Lighthouse or axe-core on each major view every sprint
- [ ] **Bump `CACHE_NAME`** on every deploy until `vite-plugin-pwa` migration in Phase 2 is complete
- [ ] **Conventional Commits discipline** — `commitlint` rejects non-conforming messages after Phase 2 toolchain setup; no bypass allowed
- [ ] **Rotate Gemini API key** if the app is deployed anywhere publicly accessible after Phase 2 proxy migration

---

## Progress Tracker

| Phase | Total Tasks | Done | Remaining |
|---|---|---|---|
| Phase 0 — Stop the Bleeding | 51 | 51 | 0 |
| Phase 1 — Core Product Promises | 38 | 0 | 38 |
| Phase 2 — Quality & Reliability | 41 | 0 | 41 |
| Phase 3 — Feature Expansion | 22 | 0 | 22 |
| **Total** | **152** | **51** | **101** |

> Update the "Done" column as tasks are completed. Each `[x]` checkbox in a phase counts as one Done task.
