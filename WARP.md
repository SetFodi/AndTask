# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: SvelteKit (SPA via adapter-static) + Vite + Tailwind v4 on the frontend, Tauri v2 (Rust) on the backend. SQLite is embedded via tauri-plugin-sql with FTS5 for search.
- App features (frontend routes):
  - /dashboard: analytics dashboard with productivity insights, data visualization, and quick actions
  - /todo: draggable todo list with CRUD persisted to SQLite, enhanced with progress tracking and advanced animations
  - /notes: Markdown editor with live preview and CRUD persisted to SQLite
  - /canvas: local drawing canvas with undo/redo and PNG export (in-memory only)
- Enhanced UI Components: Reusable component library in src/lib/components/ (Button, Badge, Progress, Modal, DataManager)
- Notable frontend APIs: Svelte 5 runes ($state, $effect, $derived), @tauri-apps/api (window controls), @tauri-apps/plugin-sql for DB.

Prerequisites
- Bun (preferred) or Node.js (if you choose npm). Rust toolchain for Tauri.

Core commands
- Install dependencies
  - Bun (preferred):
    - bun install
  - npm (alternative):
    - npm install
- Frontend dev (web, Vite dev server on 1420)
  - bun run dev
- Type checking (Svelte + TS)
  - bun run check
  - bun run check:watch
- Frontend build (generates build/ for Tauri to consume)
  - bun run build
- Frontend preview
  - bun run preview
- Tauri app (desktop) dev
  - bunx tauri dev
- Tauri app (desktop) build
  - bunx tauri build

Notes
- Tauri dev/build automatically runs the frontend scripts as configured in src-tauri/tauri.conf.json (beforeDevCommand: "bun run dev", beforeBuildCommand: "bun run build").
- No test framework is set up in this repo; running a single test is not applicable at present.
- Linting is not configured; rely on bun run check (svelte-check) and TypeScript.
- For LAN/mobile HMR during dev, Vite reads TAURI_DEV_HOST; set it if needed, e.g. TAURI_DEV_HOST=192.168.x.x bunx tauri dev.

High-level architecture and data flow
- Frontend SPA (SvelteKit)
  - SvelteKit is configured as an SPA (SSR disabled) to integrate with Tauri. See:
    - svelte.config.js: adapter-static with fallback: "index.html"
    - src/routes/+layout.ts: export const ssr = false
  - Global layout (src/routes/+layout.svelte)
    - Provides the window chrome (macOS-style controls via @tauri-apps/api/window)
    - Enhanced sidebar navigation with animated hover states and active indicators
    - Advanced command palette (⌘K) that merges navigation items with DB full-text search results
    - Theme handling (light/dark) persisted in localStorage with smooth transitions
  - Component System
    - Reusable UI components in src/lib/components/ with consistent design tokens
    - Advanced animations using CSS custom properties and spring physics
    - Comprehensive accessibility features (focus management, screen reader support)
  - Styling
    - Tailwind v4 via @tailwindcss/vite with extensive custom CSS system in src/app.css
    - Advanced design tokens for colors, animations, spacing, and shadows
    - Responsive design with glass morphism effects and micro-interactions
- Database access layer (frontend)
  - src/lib/database.ts centralizes all DB operations using @tauri-apps/plugin-sql
    - Connection initialized via Database.load('sqlite:andtask.db')
    - Todo CRUD: getAllTodos, addTodo, updateTodo, deleteTodo
    - Notes CRUD: getAllNotes (with fallback query), getNote, createNote, updateNote, deleteNote, saveNote
    - Full-text search: searchContent(query) over a virtual FTS5 table (search_fts) using bm25 ranking
    - Side effects maintain the FTS index alongside CRUD operations
  - Consumers
    - /todo uses database.ts todo APIs, plus svelte-dnd-action for drag-and-drop and keyboard shortcuts for accessibility
    - /notes uses database.ts notes APIs, marked for Markdown rendering, manual save button, and basic toolbar insertions
    - The global command palette invokes searchContent and merges results with base navigation entries
- Backend (Tauri, Rust)
  - Entry points
    - src-tauri/src/main.rs calls app_lib::run()
    - src-tauri/src/lib.rs defines run() and Tauri setup
  - Plugins and commands
    - tauri_plugin_sql with migrations applied to sqlite:andtask.db
    - tauri_plugin_opener for external links
    - Example command greet exposed to frontend via @tauri-apps/api/core.invoke
  - Database migrations (authoritative schema)
    - Defined in src-tauri/src/lib.rs as a vector of Migration { version, description, sql, kind }
    - Current versions:
      1) create_todos_table
      2) create_notes_table (initially without title)
      3) create_concerns_table
      4) create_fts_virtual_table_v2 (search_fts FTS5)
      5) add_title_to_notes (ALTER TABLE)
    - On app start, migrations run against sqlite:andtask.db to ensure schema consistency
  - App configuration
    - src-tauri/tauri.conf.json defines build/dev commands, window configuration (transparent, frameless-like with custom chrome), and bundling targets

Practical development flows
- Web-only iteration
  - bun run dev to iterate on Svelte components and styles quickly (http://localhost:1420). Note that some Tauri APIs (like window controls, plugin-sql) require running inside Tauri.
- Desktop iteration with DB and native window controls
  - bunx tauri dev to run the full desktop app, which also launches the Vite dev server as per Tauri config
- Schema changes
  - Add a new Migration in src-tauri/src/lib.rs with an incremented version and the appropriate SQL (Up). Keep FTS index maintained in DB calls (src/lib/database.ts) as needed.

Important bits from README.md
- Recommended IDE extensions: VS Code + Svelte, Tauri, rust-analyzer.

File locations worth knowing
- Frontend entry/layout: src/routes/+layout.svelte, global CSS at src/app.css
- UI Components: src/lib/components/ (Button.svelte, Badge.svelte, Progress.svelte, Modal.svelte, DataManager.svelte)
- Data layer: src/lib/database.ts (single source of truth for SQLite ops and FTS)
- Dashboard: src/routes/dashboard/+page.svelte (analytics and data visualization)
- Tauri setup and migrations: src-tauri/src/lib.rs, src-tauri/src/main.rs, src-tauri/tauri.conf.json
- Build outputs consumed by Tauri: build/ (produced by bun run build)

New features and enhancements
- Advanced Analytics Dashboard: Real-time productivity insights with interactive charts and progress tracking
- Component Library: Reusable UI components with advanced animations and accessibility features
- Data Management: Export/import functionality for data backup and restoration
- Enhanced Animations: Spring physics, micro-interactions, and smooth state transitions
- Improved Accessibility: Focus management, keyboard navigation, and screen reader support
- Performance Optimizations: Efficient state management, loading states, and optimized rendering

