# Project Tracker Pro — Development Roadmap

> Derived from `AUDIT.md` · March 2026  
> Tasks are ordered by priority within each phase. Check off items as they are completed.

---

## Decision Record: Global Users → Project-Scoped Members

Before reading the task list, understand the architectural decision that shapes Phase 0 and Phase 1.

**What is wrong today:** The `users` table is a global registry. Users exist independently of any project, their identities are fabricated at seed time with no connection to any real authentication system. The `project_users` join table maps these fake IDs to projects. The current `db.getProjectTeam()` method already proves the concept of project-scoped membership is correct — the implementation is just built on the wrong foundation.

**The correct model:**

- A person's **identity** comes from the authentication provider (Firebase UID). The app never invents its own user IDs.
- A person's **presence on a project** is recorded in a `project_members` table: `(projectId, authUid, displayName, photoUrl, role)`. Populated at sign-in time. Scoped entirely to a project.
- There is **no global `users` table**. A member only exists in the context of a specific project they belong to.

**What gets removed vs what stays:**

| Thing | Decision | Reason |
|---|---|---|
| `users` table | ❌ Deleted | Global registry replaced by auth provider identity |
| `project_users` join table | ❌ Deleted | Replaced by `project_members` with real auth UIDs |
| `User` interface | ❌ Deleted | Replaced by `AuthUser` (auth layer) + `ProjectMember` (db layer) |
| `addUser`, `updateUser`, `deleteUser`, `getUsers` | ❌ Deleted | Identity is managed by the auth provider, not the app |
| `getProjectTeam()` | ❌ Deleted | Replaced by `getProjectMembers()` querying `project_members` |
| `addUserToProject()`, `removeUserFromProject()` | ❌ Deleted | Replaced by `addProjectMember()` / `removeProjectMember()` |
| `ProfileSettingsView` | ❌ Deleted | Replaced in Phase 1 by auth-aware `ProfileView` |
| `localStorage.getItem('myUserId')` | ❌ Deleted | Replaced by `useAuth().user.uid` |
| `project_members` table | ✅ Created in Phase 0 | The correct project-scoped membership model |
| `TeamView` | ✅ Stubbed in Phase 0, rebuilt in Phase 1 | Concept is correct — implementation gets real data |
| `assigneeIds` on `Task` | ✅ Stays — no schema change | Will store Firebase UIDs instead of fake IDs |
| `Avatar` component | ✅ Updated in Phase 0 | Accepts `displayName`/`photoUrl` — no longer tied to `User` |
| Assignee UI in `TaskForm`, `TaskDetailModal`, `TaskCard` | ✅ Simplified in Phase 0, restored in Phase 1 | Works against `project_members` once auth is wired |

**Why this is safe to do in Phase 0 before auth exists:** `project_members` starts as an empty table. `db.getProjectMembers()` returns an empty array. Nothing crashes — assignee pickers render with an empty state. Phase 1 populates the table at sign-in time.

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
> **Goal:** Replace the global `User` entity with the project-scoped `project_members` model, implement all missing db methods, and eliminate every runtime crash. Every existing view must render without errors before Phase 1 begins.  
> **Target:** Before any public or team demo.

### 🔴 Identity Migration — Global `users` → `project_members`

#### Step 1 — Replace Tables in `db.ts`

- [x] Remove the `users` table `CREATE TABLE` statement from `createTables()` in `db.ts`
- [x] Remove the `project_users` join table `CREATE TABLE` statement from `createTables()` in `db.ts`
- [x] Add the `project_members` table to `createTables()` in `db.ts`:
  ```sql
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
  ```
- [x] Add `ProjectMember` interface export to `db.ts`:
  ```ts
  export interface ProjectMember {
    id: string;
    projectId: string;
    authUid: string;
    displayName: string;
    photoUrl: string | null;
    role: string;
    joinedAt: string;
  }
  ```
- [x] Delete the `User` interface export from `db.ts`
- [ ] Remove `users` and `project_users` from the `persist()` table list in `db.ts`
- [ ] Remove `users` and `project_users` from the IndexedDB restore loop in `db.init()`
- [ ] Add `project_members` to the `persist()` table list in `db.ts`
- [ ] Add `project_members` to the IndexedDB restore loop in `db.init()`

#### Step 2 — Replace User Methods with Member Methods in `db.ts`

- [ ] Delete `db.getUsers()` from `db.ts`
- [ ] Delete `db.getProjectTeam()` from `db.ts`
- [ ] Delete `db.addUser()` from `db.ts`
- [ ] Delete `db.updateUser()` from `db.ts`
- [ ] Delete `db.deleteUser()` from `db.ts`
- [ ] Delete `db.addUserToProject()` from `db.ts`
- [ ] Delete `db.removeUserFromProject()` from `db.ts`
- [ ] Add `db.getProjectMembers(projectId): Promise<ProjectMember[]>` — queries `project_members WHERE project_id = ?`
- [ ] Add `db.addProjectMember(projectId, authUid, displayName, photoUrl?, role?): Promise<string>` — uses `INSERT OR IGNORE` so it is safe to call on every sign-in session
- [ ] Add `db.removeProjectMember(projectId, authUid): Promise<void>`

#### Step 3 — Seeder Cleanup

- [ ] Remove `SEED_USERS` array and its type imports from `src/services/seedData.ts`
- [ ] Remove all `INSERT INTO users` statements from `src/services/seeder.ts`
- [ ] Remove all `INSERT INTO project_users` statements from `src/services/seeder.ts`
- [ ] Remove the `otherUserIds` variable and all logic that builds or iterates it in `seeder.ts`
- [ ] Remove the `"Me" user` bootstrap block from `seeder.ts`
- [ ] Remove `localStorage.setItem('myUserId', ...)` calls from `seeder.ts` — identity comes from auth
- [ ] Remove `localStorage.setItem('myUserId', 'me')` from `src/main.tsx`
- [ ] Remove `assigneeType` field from every task object in `SEED_TASKS` in `src/services/seedData.ts`
- [ ] Remove `tAssignees` variable and `assignee_ids` bind value from the task insert loop in `seeder.ts` — tasks seed unassigned until auth provides a real UID
- [x] Verify seeder runs without errors after all removals: `npm run seed`

#### Step 4 — Remove `ProfileSettingsView`, Stub `TeamView`

`ProfileSettingsView` managed the hand-rolled user entity — it is deleted here and rebuilt in Phase 1 against `useAuth()`. `TeamView` is kept as a stub because the concept is correct — it will be rebuilt in Phase 1 against `project_members`.

- [ ] Delete `src/views/ProfileSettingsView.tsx`
- [ ] Remove the `/project/:name/profile` route from `App.tsx`
- [ ] Remove the `Profile` link from the `Sidebar` footer in `Navigation.tsx`
- [ ] Remove the `Profile` link from the `Navbar` user avatar click target in `Navigation.tsx`
- [ ] Replace the user avatar + name display block in the `Sidebar` footer with a static placeholder: `<p>Sign in to see your profile</p>` — wired in Phase 1
- [ ] Remove `currentUser` prop (`User` type) from `Sidebar` component signature and all `App.tsx` call sites
- [ ] Remove `currentUser` prop (`User` type) from `Navbar` component signature and all `App.tsx` call sites
- [ ] Remove `currentUser` state (`User | null`) and `refreshUser()` function from `App.tsx`
- [ ] Remove the `profileUpdated` custom event listener from `App.tsx`
- [ ] Gut `src/views/TeamView.tsx` — remove all hand-rolled CRUD logic, replace body with a `<p>Team management available after sign-in.</p>` placeholder; file stays and will be rebuilt in Phase 1

#### Step 5 — Clean Up `ProjectSettingsView`

- [ ] Remove the entire **Team Management** UI section from `ProjectSettingsView.tsx` — the member grid, "Add Member" and "Invite New" buttons, and both modals
- [ ] Remove `handleAddUser`, `handleRemoveUser`, `handleCreateUser`, `handleDeleteUserGlobally` functions
- [ ] Remove `isAddUserModalOpen`, `isCreateUserModalOpen`, `newUserName`, `newUserEmail`, `newUserRole` state variables
- [ ] Remove `allUsers`, `team`, `fetchTeam()` and their `useEffect` call

#### Step 6 — Simplify Assignee UI (Temporary — Restored in Phase 1 Step 9)

`assigneeIds` stays on `Task` — no schema change needed. The assignee UI is temporarily simplified because there are no real members to display until Phase 1 populates `project_members`.

- [ ] In `TaskForm.tsx`: remove the `users?: User[]` prop and the Assignees pill section from the form — tasks are created unassigned for now
- [ ] In `TaskForm.tsx`: remove `assigneeIds` from the `onSubmit` payload temporarily
- [ ] In `TaskDetailModal.tsx`: replace the `db.getProjectTeam()` call with `db.getProjectMembers(task.projectId)` — returns an empty array until Phase 1; keep the Assignees panel UI in place rendering the empty state
- [ ] In `BoardView.tsx`: remove `usersData` from `fetchData()` and the `users` prop from `TaskForm`
- [ ] In `TaskCard.tsx`: guard the avatar stack render: only render when `assignees.length > 0`

#### Step 7 — Update `Avatar` Component

`Avatar` stays. Decouple it from the deleted `User` type so it is ready for auth-provided data:

- [ ] Replace `initials?: string` and `src?: string` props with `displayName: string` and `photoUrl?: string`
- [ ] Derive initials internally: `displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)`
- [ ] Update all `<Avatar>` call sites to pass `displayName` instead of `initials`

#### Step 8 — Verification

- [ ] Run `tsc --noEmit` — zero errors relating to `User`, `getUsers`, `getProjectTeam`, `addUser`, `updateUser`, `deleteUser`, `addUserToProject`, `removeUserFromProject`
- [ ] Run the app — confirm no console errors on any view
- [ ] Confirm the `/project/:name/profile` route no longer exists (redirect or 404)
- [ ] Confirm `TeamView` renders its placeholder text without crashing
- [ ] Confirm `TaskDetailModal` Assignees panel renders an empty state without crashing
- [ ] Confirm `TaskForm` creates a task successfully without assignees

---

### 🔴 DB Layer — Missing Sprint Methods

These are called by `SprintView` but do not exist in `db.ts` — the view throws on every load today.

- [ ] Add a `sprints` table to `createTables()` in `db.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS sprints (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    start_date  TEXT,
    end_date    TEXT,
    status      TEXT DEFAULT 'planned',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  ```
- [ ] Export `interface Sprint { id: string; projectId: string; name: string; startDate: string; endDate: string; status: 'planned' | 'active' | 'completed' }` from `db.ts`
- [ ] Add `db.getSprints(projectId): Promise<Sprint[]>` to `db.ts`
- [ ] Add `db.addSprint(sprint: Omit<Sprint, 'id'>): Promise<string>` to `db.ts`
- [ ] Add `sprints` to the `persist()` table list and the IndexedDB restore loop in `db.ts`

---

### 🔴 Bug Fixes — Broken View Logic

- [ ] **`CalendarView`** — Remove the non-existent `assigneeId` field from the `addTask` object literal — tasks are created unassigned until auth is wired in Phase 1
- [ ] **`CalendarView`** — Fix broken loading state: the `if (loading) { // ... }` stub has no `return` — add `return <LoadingSpinner />` so the spinner actually renders
- [ ] **`BoardView`** — Wire `onDelete` from `TaskCard` context menu through `SortableTaskCard` to `db.deleteTask(id)` then call `fetchData()`
- [ ] **`BoardView`** — Wire `onArchive` from `TaskCard` context menu to `db.updateTask(id, { isArchived: true })` then call `fetchData()`
- [ ] **`DashboardView`** — Fix broken "View all tasks" navigation: replace `route('/project/${currentProject.id}/board')` with `route('/project/${slugify(currentProject.name)}/board')`

---

### 🔴 Data Safety — Async Persistence Race Condition

- [ ] Replace the `async persist()` call inside `beforeunload` with a `visibilitychange` listener as the primary trigger:
  ```ts
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && this.isDirty) this.persist();
  });
  ```
- [ ] Keep `beforeunload` as a secondary last-resort signal — not awaited, fire-and-hope
- [ ] Add `isDirty: boolean` flag to `DatabaseService` — set `true` on every write, `false` after a successful `persist()`
- [ ] Add a "Saving…" / "All changes saved" status indicator in `Navbar` driven by the `isDirty` flag

---

### 🔴 PWA — Fix Offline Install Failure

- [ ] Download the two app icon images and save as `public/icons/icon-192.png` and `public/icons/icon-512.png`
- [ ] Update both `"src"` fields in `public/manifest.json` to use local paths (`/icons/icon-192.png`, `/icons/icon-512.png`)

---

### ⚡ Quick Wins — Fix in One Sitting

- [ ] Remove duplicate `vite` entry from `dependencies` in `package.json` — keep only in `devDependencies`
- [ ] Add missing `import { useState, useEffect } from 'preact/hooks'` to `SprintView.tsx`
- [ ] Add `localStorage.setItem('hasSeenLanding', 'true')` to `seeder.ts` so returning users skip the landing page
- [ ] Add `<meta name="apple-mobile-web-app-title" content="TrackerPro" />` to `index.html`

---

## Phase 1 — Core Product Promises
> **Goal:** Implement real authentication, rebuild project membership on top of real auth identities, restore the full assignee UI, and deliver the remaining core product promises.  
> **Target:** End of Sprint 1 after Phase 0.

### 🟠 Authentication — Firebase with Decoupled Provider Adapter

**Design principle:** Firebase is an implementation detail. The app communicates only with an `AuthProvider` interface. The Firebase adapter is the only file in the entire project that imports from `'firebase'`. Swapping to Auth0, Supabase, or any other federated provider requires replacing one adapter file — zero changes to views, hooks, context, or the database layer.

#### Step 1 — Define the `AuthProvider` Interface

- [ ] Create `src/auth/AuthProvider.ts`:
  ```ts
  export interface AuthUser {
    uid: string;
    displayName: string;
    email: string | null;
    photoUrl: string | null;
  }

  export interface AuthProvider {
    /** Subscribe to auth state changes — returns an unsubscribe function */
    onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
    /** Sign in via Google federated popup */
    signInWithGoogle(): Promise<AuthUser>;
    /** Sign out the current session */
    signOut(): Promise<void>;
    /** Return the current user synchronously, or null if not signed in */
    getCurrentUser(): AuthUser | null;
  }
  ```
- [ ] Create `src/auth/getAuthProvider.ts` — singleton factory:
  ```ts
  import type { AuthProvider } from './AuthProvider';

  let instance: AuthProvider | null = null;

  export function initAuth(provider: AuthProvider): void {
    instance = provider;
  }

  export function getAuthProvider(): AuthProvider {
    if (!instance) throw new Error('Auth not initialised — call initAuth() before rendering.');
    return instance;
  }
  ```
- [ ] Create `src/auth/index.ts` — the only import path the rest of the app uses:
  ```ts
  export type { AuthUser, AuthProvider } from './AuthProvider';
  export { initAuth, getAuthProvider } from './getAuthProvider';
  ```

#### Step 2 — Implement the Firebase Adapter

- [ ] Install Firebase: `npm install firebase`
- [ ] Create `src/auth/adapters/FirebaseAuthAdapter.ts` — the **only** file in the codebase that imports from `'firebase'`:
  ```ts
  import { initializeApp } from 'firebase/app';
  import {
    getAuth,
    onAuthStateChanged as fbOnAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as fbSignOut,
    type User as FirebaseUser,
  } from 'firebase/auth';
  import type { AuthProvider, AuthUser } from '../AuthProvider';

  function toAuthUser(fb: FirebaseUser): AuthUser {
    return {
      uid: fb.uid,
      displayName: fb.displayName ?? 'Anonymous',
      email: fb.email,
      photoUrl: fb.photoURL,
    };
  }

  export function createFirebaseAuthAdapter(): AuthProvider {
    const app = initializeApp({
      apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
    });
    const auth = getAuth(app);

    return {
      onAuthStateChanged(callback) {
        return fbOnAuthStateChanged(auth, user => callback(user ? toAuthUser(user) : null));
      },
      async signInWithGoogle() {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        return toAuthUser(result.user);
      },
      async signOut() {
        await fbSignOut(auth);
      },
      getCurrentUser() {
        return auth.currentUser ? toAuthUser(auth.currentUser) : null;
      },
    };
  }
  ```
- [ ] Create `src/auth/adapters/index.ts` re-exporting `createFirebaseAuthAdapter`
- [ ] Add Firebase env vars to `.env.example`:
  ```
  # Firebase Auth — get these values from your Firebase project console.
  # Note: VITE_* values are embedded in the browser bundle.
  # Only use a Firebase project scoped specifically to this application.
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  ```

#### Step 3 — Bootstrap Auth in `main.tsx`

- [ ] Import `initAuth` and `createFirebaseAuthAdapter` in `main.tsx`
- [ ] Call `initAuth(createFirebaseAuthAdapter())` before `render(<App />, ...)` — auth is registered before any component mounts
- [ ] Confirm `localStorage.setItem('myUserId', 'me')` has already been removed (Phase 0 Step 3)

#### Step 4 — `AuthContext` and `useAuth` Hook

- [ ] Create `src/context/AuthContext.tsx`:
  ```ts
  import { createContext } from 'preact';
  import { useContext, useState, useEffect } from 'preact/hooks';
  import { getAuthProvider } from '../auth';
  import type { AuthUser } from '../auth';

  interface AuthContextValue {
    user: AuthUser | null;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
  }

  const Ctx = createContext<AuthContextValue | null>(null);

  export function AuthProvider({ children }: { children: preact.ComponentChildren }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      return getAuthProvider().onAuthStateChanged(u => {
        setUser(u);
        setIsLoading(false);
      });
    }, []);

    return (
      <Ctx.Provider value={{
        user,
        isLoading,
        signInWithGoogle: () => getAuthProvider().signInWithGoogle().then(setUser),
        signOut: () => getAuthProvider().signOut().then(() => setUser(null)),
      }}>
        {children}
      </Ctx.Provider>
    );
  }

  export function useAuth(): AuthContextValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
  }
  ```
- [ ] Wrap `<App />` in `<AuthProvider>` in `main.tsx`
- [ ] Replace `isLoggedIn` localStorage state in `App.tsx` with `const { user, isLoading } = useAuth()`
- [ ] Replace `LoginView` render condition: show when `!user && !isLoading`
- [ ] Replace `LandingView` render condition: show when `!user && !isLoading && !hasSeenLanding`

#### Step 5 — Wire `LoginView`

- [ ] Replace the simulated `setTimeout` login in `LoginView.tsx` with `const { signInWithGoogle } = useAuth()`
- [ ] Remove the fake email/password fields — keep only the Google sign-in button
- [ ] Show a loading spinner while `isLoading === true` to prevent a flash of unauthenticated content

#### Step 6 — Project Member Sync at Sign-In

When a user signs in and opens a project, register them as a project member:

- [ ] In `App.tsx`, after `db.init()` resolves and `user` is non-null, call `db.addProjectMember(currentProjectId, user.uid, user.displayName, user.photoUrl)` — the `UNIQUE (project_id, auth_uid)` constraint makes this idempotent, so it is safe to call on every session
- [ ] Replace all remaining `localStorage.getItem('myUserId')` reads with `user.uid` from `useAuth()`: `db.addTask` default assignee, `db.addComment` author, `db.startTaskTimer` actor

#### Step 7 — Rebuild `TeamView`

- [ ] Replace the Phase 0 placeholder in `TeamView.tsx` with a full implementation:
  - Calls `db.getProjectMembers(currentProject.id)` to fetch the member list
  - Renders each member as a card: `<Avatar displayName={m.displayName} photoUrl={m.photoUrl} />` + display name + role + joined date
  - Allows the project owner (`role === 'owner'`) to call `db.removeProjectMember(projectId, m.authUid)` via a remove button
- [ ] Re-add `/project/:name/team` route to `App.tsx`
- [ ] Re-add the Team link to the `Sidebar` navigation items

#### Step 8 — Rebuild Profile View

- [ ] Create `src/views/ProfileView.tsx` — reads entirely from `useAuth()`, not from the database:
  - Displays `user.displayName`, `user.email`, `user.photoUrl`
  - Provides a **Sign Out** button that calls `signOut()`
  - Profile data is read-only — managed by the identity provider, not the app
- [ ] Add `/project/:name/profile` route to `App.tsx`
- [ ] Wire the `Sidebar` footer user section to display `user.displayName` and `user.photoUrl` from `useAuth()`
- [ ] Wire the `Navbar` avatar to display the signed-in user from `useAuth()`

#### Step 9 — Restore Full Assignee UI

With `project_members` now populated from real sign-ins, restore everything simplified in Phase 0:

- [ ] In `TaskForm.tsx`: restore the Assignees section — call `db.getProjectMembers(projectId)`, render pill toggles using `<Avatar displayName={m.displayName} photoUrl={m.photoUrl} />`
- [ ] In `TaskForm.tsx`: restore `assigneeIds` (array of `authUid` strings) in the `onSubmit` payload
- [ ] In `TaskDetailModal.tsx`: restore the full Assignees sidebar panel — call `db.getProjectMembers(task.projectId)`, render with `ProjectMember` objects
- [ ] In `BoardView.tsx` / `TaskCard.tsx`: restore the avatar stack — map `task.assigneeIds` against `project_members` to get `displayName`/`photoUrl`

#### Step 10 — Provider Swap Verification

- [ ] Add a **"Swapping the Auth Provider"** section to `README.md`: create a file implementing `AuthProvider`, call `initAuth(createYourAdapter())` in `main.tsx` — no other files need to change
- [ ] Verify the claim: temporarily create a `MockAuthAdapter` with hardcoded test values, swap it in `main.tsx`, confirm the full app works end-to-end without touching any view, hook, or service file

---

### 🟠 Data Export & Backup

- [ ] Add an **Export to JSON** button in `ProjectSettingsView` — downloads tasks, columns, members, comments, and subtasks for the current project as a single `.json` file
- [ ] Add a **Download SQLite Backup** button in `ProjectSettingsView` — exports the raw `.db` blob from IndexedDB as a downloadable file
- [ ] Add an **Import from Backup** flow in `ProjectSettingsView` — accepts `.json` or `.db` and restores the data
- [ ] Show a data-age warning in `ProjectSettingsView`: "Last backup: X days ago"

---

### 🟠 Error Boundaries — Prevent Full App Crashes

- [ ] Create `src/components/ErrorBoundary.tsx` as a Preact class component with a friendly fallback UI ("Something went wrong — tap to retry")
- [ ] Wrap `BoardView` in `<ErrorBoundary>`
- [ ] Wrap `SprintView` in `<ErrorBoundary>`
- [ ] Wrap `TeamView` in `<ErrorBoundary>`
- [ ] Wrap `ProjectSettingsView` in `<ErrorBoundary>`
- [ ] Wrap `TaskDetailModal` in `<ErrorBoundary>`
- [ ] Add global `window.onerror` and `window.onunhandledrejection` listeners that log errors and show a non-intrusive toast notification

---

### 🟠 Mobile Search — Inaccessible on Phones

- [ ] Add a search icon button to `BottomNav`
- [ ] Build a `SearchOverlay` full-screen modal that activates on tap
- [ ] Wire `SearchOverlay` to the same `searchQuery` state prop already used by `BoardView`
- [ ] Make the `Navbar` search bar visible on mobile (currently hidden below the `sm` breakpoint)

---

### 🟠 Activity Feed — Always Empty After Seed

- [ ] Write `addActivity()` call in `db.addTask()` — log `actorUid` from `useAuth()` + `"created task X"`
- [ ] Write `addActivity()` call in `db.updateTask()` — log `actorUid` + `"updated task X"`
- [ ] Write `addActivity()` call in `db.deleteTask()` — log `actorUid` + `"deleted task X"`
- [ ] Write `addActivity()` call in `db.addComment()` — log `actorUid` + `"commented on task X"`
- [ ] Write `addActivity()` call in `db.startTaskTimer()` / `stopTaskTimer()` — log `actorUid` + `"tracked N minutes on task X"`
- [ ] Resolve `actorUid` against `project_members` in the `DashboardView` activity feed to display name + avatar
- [ ] Paginate the activity feed in `DashboardView` (currently slices to 5 — add a "Load more" button)

---

## Phase 2 — Quality & Reliability
> **Goal:** Make the codebase robust enough to extend safely. Fix the architecture issues that compound with every new feature.  
> **Target:** Sprint 2.

### 🟡 Persistence — Schema Migration Safety

- [ ] Add a `schema_version` key to the IndexedDB store, starting at `1`
- [ ] Write `migrateSchema(fromVersion: number, db: any)` in `db.ts` — handles column additions gracefully
- [ ] Increment `schema_version` on every schema change and add a corresponding migration step
- [ ] Add a `runSql(sql: string, bind?: any[])` wrapper around `db.exec()` — catches and logs errors in development instead of silently no-oping

---

### 🟡 Routing — Single Source of Truth

- [ ] Remove `currentProjectId` from `App.tsx` state
- [ ] Derive `currentProject` with `useMemo` — parse `window.location.pathname` and match against the `projects` array
- [ ] Remove the `handleRouteChange` `popstate` listener from `App.tsx`
- [ ] Audit all `route()` calls — confirm all use slugified project names, never raw IDs

---

### 🟡 Type Safety — Eliminate `any` in DB Row Callbacks

- [ ] Define typed row tuple types for each table (e.g. `type TaskRow = [string, string, string, ...]`)
- [ ] Replace all `callback: (r: any[]) => ...` in `db.ts` with typed row destructuring
- [ ] Set `"strict": true` in `tsconfig.json` and fix all resulting type errors
- [ ] Confirm `npm run lint` runs in CI to catch type regressions on every PR

---

### 🟡 Performance — Optimistic Updates in `BoardView`

- [ ] On drag-end, immediately update local `tasks` state without waiting for `fetchData()`
- [ ] Call `db.updateTaskColumn()` in the background after the optimistic state update
- [ ] On error, revert local state and show a toast notification
- [ ] Apply the same pattern to task creation: append the new task to local state before the DB write resolves

---

### 🟡 PWA — Proper Asset Pre-caching

- [ ] Decide: configure `vite-plugin-pwa` properly **or** remove it from `package.json`
- [ ] **If using `vite-plugin-pwa`:** add to `vite.config.ts`, configure `workbox.globPatterns` to include `**/*.{js,css,html,wasm}`, delete the hand-rolled `public/sw.js`
- [ ] **If keeping hand-rolled SW:** add a build script that injects the Vite asset manifest into `sw.js` at build time; replace the hardcoded `CACHE_NAME = 'project-tracker-v2'` with an auto-generated hash
- [ ] Test offline end-to-end: load the app, disable network, hard-reload — full UI must load from cache

---

### 🟡 Performance — SQLite WASM Cold Start

- [ ] Build a proper splash screen with step-by-step progress text ("Loading database…", "Restoring your data…", "Ready")
- [ ] Move SQLite WASM initialisation into a Web Worker so the main thread stays responsive during the 300–800ms init window
- [ ] Pre-warm the WASM module during the `LoginView` render so it is ready before the user enters the app

---

### 🟡 Code Organisation — Decompose `TaskDetailModal`

- [ ] Extract `<TaskHeader />` — title, status badge, priority pill, complete button
- [ ] Extract `<SubtaskList />` — subtask CRUD + linked progress logic
- [ ] Extract `<CommentThread />` — comment list + add comment
- [ ] Extract `<AssigneePanel />` — assignee pills reading from `project_members` + add/remove modal
- [ ] Extract `<TimeTracker />` — elapsed display + start/stop button
- [ ] Extract `<TaskMetaPanel />` — due date, priority editor, progress bar sidebar
- [ ] Keep `TaskDetailModal` as a thin layout shell composing the above

---

### 🟡 Code Organisation — Split `db.ts` into Domain Repositories

- [ ] Create `src/services/repos/` directory
- [ ] Extract project methods → `repos/projectRepo.ts`
- [ ] Extract task methods → `repos/taskRepo.ts`
- [ ] Extract sprint methods → `repos/sprintRepo.ts`
- [ ] Extract member methods → `repos/memberRepo.ts`
- [ ] Extract comment/subtask/activity methods → `repos/activityRepo.ts`
- [ ] Keep `db.ts` as the entry point that re-exports a composed `db` object from all repos

---

### 🟡 Input Validation — Prevent Runaway Data

- [ ] Add `maxLength={200}` to all task title inputs
- [ ] Add `maxLength={2000}` to all description textareas
- [ ] Add `maxLength={500}` to all comment inputs
- [ ] Add `maxLength={100}` to project name inputs
- [ ] Add service-layer validation in `db.addTask()` and `db.updateTask()` — trim strings and reject values exceeding limits

---

### 🟡 Security — API Key Situation

- [ ] Update `.env.example` with a prominent warning: `# WARNING: VITE_* values are embedded in the browser bundle. Only use keys scoped to this app.`
- [ ] Add a `README.md` section explaining the local-first security model and the Gemini key situation
- [ ] Route all Gemini AI calls through the Express server (already a dependency) to keep the Gemini key server-side and off the client bundle

---

### 🟡 Toolchain — Linter, Formatter & Git Hooks

The project has no automated quality gates. This section establishes the full pipeline.

#### ESLint

- [ ] Install: `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-jsx-a11y`
- [ ] Create `eslint.config.js` (ESLint v9 flat config) with rules for:
  - `@typescript-eslint/recommended-type-checked` — TypeScript strict mode
  - `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`
  - `jsx-a11y/alt-text` and `jsx-a11y/interactive-supports-focus`
  - No `console.log` in production files (warn level)
  - No `any` type (error level)
- [ ] Add `"lint": "eslint src --ext .ts,.tsx --max-warnings 0"` to `package.json` scripts
- [ ] Run `npm run lint` for the first time and fix all reported errors before proceeding

#### Prettier

- [ ] Install: `npm install -D prettier eslint-config-prettier eslint-plugin-prettier`
- [ ] Create `.prettierrc`:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "useTabs": false,
    "trailingComma": "es5",
    "printWidth": 100,
    "bracketSameLine": false,
    "arrowParens": "always"
  }
  ```
- [ ] Create `.prettierignore` excluding `dist/`, `node_modules/`, `public/sw.js`
- [ ] Add `"format": "prettier --write src/**/*.{ts,tsx,css}"` to `package.json` scripts
- [ ] Add `"format:check": "prettier --check src/**/*.{ts,tsx,css}"` to `package.json` scripts
- [ ] Run `npm run format` across `src/` to apply baseline formatting — commit as a standalone formatting commit separate from any logic changes

#### Unified Quality Script

- [ ] Add to `package.json` scripts:
  ```json
  "check": "tsc --noEmit && npm run lint && npm run format:check"
  ```
- [ ] Confirm `npm run check` exits non-zero if any gate fails — this is the CI entry point

#### Husky & lint-staged

- [ ] Install: `npm install -D husky lint-staged`
- [ ] Initialise Husky: `npx husky init`
- [ ] Configure `.husky/pre-commit` to run `npx lint-staged`
- [ ] Configure `lint-staged` in `package.json`:
  ```json
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
    "src/**/*.css": ["prettier --write"]
  }
  ```
- [ ] Test the pre-commit hook: stage a file with a lint error — the commit must be blocked

#### commitlint

- [ ] Install: `npm install -D @commitlint/config-conventional @commitlint/cli`
- [ ] Create `commitlint.config.js`: `export default { extends: ['@commitlint/config-conventional'] }`
- [ ] Configure `.husky/commit-msg`: `npx --no -- commitlint --edit $1`
- [ ] Test the commit-msg hook: attempt a commit with a non-conventional message — must be rejected

#### Conventional Commits Reference

All commits from this point must follow:

| Type | When to use |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `refactor:` | Code change with no behaviour change |
| `style:` | Formatting only — no logic changes |
| `chore:` | Tooling, deps, config — no production code |
| `docs:` | Documentation only |
| `perf:` | Performance improvement |
| `test:` | Adding or fixing tests |
| `ci:` | CI/CD configuration |

Examples:
```
feat(auth): add Firebase adapter with decoupled AuthProvider interface
fix(db): replace async beforeunload with visibilitychange persist trigger
refactor(db): split into domain repositories
chore(toolchain): add ESLint, Prettier, Husky, commitlint
docs: add WORKFLOW.md and AUDIT_GUIDE.md
```

#### `tsconfig.json` Hardening

- [ ] Set `"strict": true`
- [ ] Set `"noUnusedLocals": true`
- [ ] Set `"noUnusedParameters": true`
- [ ] Set `"noImplicitReturns": true`
- [ ] Set `"exactOptionalPropertyTypes": true`
- [ ] Fix all type errors surfaced by the strict config before marking this task done

---

## Phase 3 — Feature Expansion
> **Goal:** Build the features that differentiate the product once the foundation is solid.  
> **Target:** After Phases 0–2 are stable.

### 🟢 Dashboard — Real Data Charts

- [ ] Replace the decorative SVG wave with a real **task completion over time** line chart using the `activities` table
- [ ] Add a **task distribution by priority** donut chart
- [ ] Add a proper empty state when all tasks are done ("You're all caught up! 🎉")

---

### 🟢 Sprint Burndown Chart

- [ ] Add a `SprintDetailView` showing the sprint's tasks in a filtered Kanban view
- [ ] Implement a burndown chart: remaining tasks over sprint days
- [ ] Add sprint velocity tracking: compare estimated vs actual completion across past sprints

---

### 🟢 AI Planning Coach (Gemini Integration)

- [ ] Add a floating "AI Assist" button to `TaskDetailModal`
- [ ] Send task title + description to Gemini and stream back suggested subtasks
- [ ] Add "Generate Sprint Plan" to `SprintView` — Gemini suggests which backlog tasks to pull in based on priority and due date
- [ ] Add "Daily Standup Summary" to `DashboardView` — Gemini summarises yesterday's completions and today's in-progress tasks
- [ ] Route all Gemini calls through the Express server to keep the API key server-side

---

### 🟢 Encrypted Cloud Backup ("Zync")

- [ ] Design Zync settings UI in `ProjectSettingsView`: endpoint URL, bucket/path, access key fields
- [ ] Implement WebCrypto AES-GCM encryption of the SQLite export blob before upload
- [ ] Implement upload to any S3-compatible endpoint — user-supplied credentials, never stored server-side
- [ ] Implement download + decrypt + restore flow
- [ ] Add a background sync status indicator in `Navbar`

---

### 🟢 Task Dependencies

- [ ] Add `blocks TEXT` and `blocked_by TEXT` columns to the `tasks` table (comma-separated task IDs)
- [ ] Add a migration step for existing data
- [ ] Add a Dependencies section in `TaskDetailModal` with add/remove UI
- [ ] Show a blocked indicator on `TaskCard` when a task's blockers are not yet complete
- [ ] Prevent moving a blocked task to "Done" until all its blockers are resolved

---

### 🟢 Recurring Tasks

- [ ] Add `recurrence_rule TEXT` column to `tasks` (e.g. `DAILY`, `WEEKLY:MON`, `MONTHLY:1`)
- [ ] Add a recurrence picker in `TaskForm` and `TaskDetailModal`
- [ ] Implement a scheduler that creates new task instances for overdue recurring tasks on app startup
- [ ] Show a recurrence badge (↻) on task cards with an active rule

---

### 🟢 Accessibility — Full Keyboard Navigation on Kanban

- [ ] Add visible focus rings to all interactive elements in `BoardView` (currently suppressed by `outline-none`)
- [ ] Implement keyboard shortcuts: `N` = new task in focused column, `Enter` = open detail, `Delete` = delete selected task
- [ ] Ensure dnd-kit `KeyboardSensor` announcements are wired to ARIA live regions
- [ ] Add a keyboard shortcut reference panel accessible via `?` key

---

### 🟢 Virtual Scrolling for Large Task Lists

- [ ] Add `@tanstack/virtual` as a dependency
- [ ] Implement windowed rendering in `BacklogView` task grid
- [ ] Implement windowed rendering in `SprintView` task list
- [ ] Implement windowed rendering in each `KanbanColumn` when task count exceeds 50

---

## Ongoing / Evergreen Tasks

These have no single completion point — revisit every sprint.

- [ ] **`npm run check` in CI** — the unified gate must pass on every PR before merge
- [ ] **Integration test per new `db.ts` method** — the persistence layer has zero test coverage today
- [ ] **Performance budget** — after each feature addition, measure board render time with 100 tasks; keep under 100ms
- [ ] **Accessibility audit** — run Lighthouse or axe-core on each major view quarterly
- [ ] **Bump `CACHE_NAME`** on every deploy until `vite-plugin-pwa` migration is complete
- [ ] **Rotate the Gemini API key** if the app is deployed anywhere publicly accessible
- [ ] **Conventional Commits discipline** — `commitlint` rejects non-conforming messages; no bypass allowed

---

## Progress Tracker

| Phase | Total Tasks | Done | Remaining |
|---|---|---|---|
| Phase 0 — Stop the Bleeding | 62 | 0 | 62 |
| Phase 1 — Core Promises | 54 | 0 | 54 |
| Phase 2 — Quality & Reliability | 68 | 0 | 68 |
| Phase 3 — Feature Expansion | 27 | 0 | 27 |
| **Total** | **211** | **0** | **211** |

> Update the "Done" column manually as tasks are completed, or track via GitHub Issues/Projects.
