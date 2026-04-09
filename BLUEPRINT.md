# slab — Build Blueprint

Ordered build plan. Each phase builds on the previous. Items within a phase can be built in any order.

## What's Built

### Shell Infrastructure (Phase 1) — DONE
- **Top menu bar** — app settings left (contextual, from manifests), system icons right (KDE-style inline), clock
- **Bottom taskbar** — open apps/workflows left, quick spawn tools right (dynamic from manifests)
- **Live tile grid** — replaces desktop, tiles show live data, running indicators, click to launch
- **Modular app system** — apps in `frontend/apps/`, self-register via `Slab.register()`, discovered via `/api/shell/apps`
- **Slab API** — `register`, `createWindow`, `query`, `request`, `emit/on` event bus
- **Declarative app settings** — apps declare settings in manifest.json, desktop renders them in the top bar
- **Dynamic dependency loading** — xterm, monaco, marked loaded on-demand per app manifest
- **Cross-app capabilities** — `openTerminalWithCommand`, `openFileInEditor`, `openMediaViewer`

### Core Apps (Phase 2) — PARTIAL
- **Terminal** — DONE (websocket PTY, tabs, split panes, themes)
- **Text Editor** — DONE (Monaco, syntax highlighting, tabs, save, markdown preview, PDF)
- **System Monitor** — DONE (live CPU/RAM/disk/network/temps, live tile data)
- **File Browser** — DONE (sidebar, list/grid, previews, context menus, network places)
- **Media Viewer** — DONE (image/video, folder scanning, thumbnail strip)
- **Settings** — DONE (system-only: setup, general, performance, network, about)
- **Services** — STUB (placeholder UI)
- **Logs** — STUB (placeholder UI)
- **Notes App** — NOT STARTED

---

## Phase 3 — Complete Core Apps

Finish the remaining Tier 1 apps. Each is a new folder in `frontend/apps/`.

### 3a. Notes App
- Plain text notes, list + editor UI
- Create, edit, delete, rename
- Stored as `.txt` in `~/.config/slab/data/notes/`
- Tile preview (first lines of most recent note)
- Sticky note spawn element (plain style)

### 3b. Service Manager
- Replace stub with real systemd interface via D-Bus
- List units, start/stop/restart/enable/disable
- Status indicators, failed unit alerts
- Live tile: green/red count of running vs failed
- `getData()` for tile display

### 3c. Log Viewer
- Replace stub with real journalctl streaming via websocket
- Filter by unit, priority, time range
- Search within logs
- Live tile: last critical/error entry

---

## Phase 4 — Tile Spawn System

The core infrastructure for dropping app elements onto the tile grid — not as windows, as tiles.

### 4a. Shell: `Slab.spawnTile()`
- New shell API: `Slab.spawnTile(appId, elementId, options)` — inserts an element into the tile grid as a live tile
- Spawned tiles snap into the masonry grid alongside app launcher tiles
- Spawned tiles are resizable (drag handles, push neighbors)
- Spawned tiles have a close button (X in corner) to remove from grid
- Spawned tiles persist in user config so they survive page reloads
- `options`: initial size (normal, wide, tall, large), position hint

### 4b. Spawn Button Behavior
- Spawn buttons on the taskbar call `Slab.spawnTile()` instead of `createWindow()`
- Apps that don't implement `buildElement()` fall back to `launchApp()` (open as window)
- Same element can be spawned multiple times — each is an independent tile

### 4c. Spawn Elements
- **Sticky note** — flat text tile snapped into grid, auto-saves
- **Terminal** — single shell tile in the grid, click to interact
- **File browser** — single folder view tile, click to expand or open full app
- **Bookmark** — single URL tile

### 4d. Tile vs Window
- Tiles live on the grid (background layer), windows float above
- A tile can "pop out" into a window (full app mode) and back
- Quick spawn always creates tiles. App launcher tiles always create windows.
- Both coexist — a sticky note tile on the grid behind a terminal window
- **Bookmark** — single pinned URL

### 4c. Sticky Note Features
- Spawn multiple, each as its own tile
- Stack into tabbed tile or spread out
- Plain style first (legal pad + canvas later)

---

## Phase 5 — Workspaces

The workflow system.

### 5a. Workspace Data Model
- Workspace definition format (`~/.config/slab/workspaces/*.json`)
- Define: scoped folders, bookmarks, terminal commands, tile layout, toolbar config
- Default workspace (full desktop, no scoping)

### 5b. Workspace Switching
- Workflows tile on the start grid lists saved workspaces
- Opening a workspace adds it to the taskbar like an app
- Focusing a workspace swaps the tile grid context
- Multiple workspaces open simultaneously on taskbar
- Standalone apps coexist alongside workspace tabs

### 5c. App Scoping
- File browser roots to workspace-defined folder, subfolders become sidebar entries
- Terminal opens in workspace-defined directory
- Bookmarks become standalone tiles per workspace
- Tile grid shows only workspace-relevant tiles

### 5d. Spawned Element Scoping
- Quick-spawned items belong to the active workspace
- Disappear when switching away, reappear when returning
- Desktop-mode spawns persist globally

### 5e. Per-Workflow Toolbar
- Each workspace overrides which quick spawn tools are visible
- Coding: terminal + file browser. School: sticky notes + timer.

---

## Phase 6 — Adaptive Tiles

Progressive disclosure and tile morphing.

### 6a. Dual-Mode App Rendering
- Apps detect context: desktop mode (full UI) vs workflow mode (slim tile variant)
- File browser slim mode: vertical folder list only, no toolbar/path bar
- Terminal slim mode: live output preview, click to expand
- Same components, conditional rendering

### 6b. Tile Morphing
- Click a slim file list → tile expands to full file browser
- Click a file → tile morphs to text editor or media viewer
- Back button steps back through morph history
- Tile resizes and reflows neighbors during morph

### 6c. Tile Spawning and Splitting
- Spawn second instance of a tile type (two file browsers side by side)
- Drag folder out of file tile to create new tile
- Auto-tiling arranges spawned tiles

---

## Phase 7 — Hybrid Tiling

Hyprland + iPadOS auto-tiling. Can be built alongside Phase 6.

### 7a. Auto-Tiling Engine
- Opening an app fills half the screen, tile grid compresses to other half
- Second app splits the space automatically
- Layout algorithm decides arrangement

### 7b. iPadOS Flexibility
- Drag dividers to adjust split ratios fluidly
- Not snapped to rigid presets — continuous resize

### 7c. Full-Screen and Dismissal
- Full-screen opt-in (double-click title bar or hotkey)
- Tile grid accessible via edge swipe or hotkey from full-screen
- Dismiss app → tiles reflow to fill space

---

## Phase 8 — Onboarding

### 8a. First Launch Flow
- Choice: "Set up a workspace" or "Just use it"
- Guided workspace builder: pick purpose, scope folders, pin URLs, pick tile layout
- Under a minute to complete

### 8b. Workspace Templates
- Pre-built templates: coding, school, server admin, media
- User selects and customizes

---

## Phase 9 — Polish and Extensions

Build in any order. Each is independent.

### 9a. Taskbar Customization
- Add, remove, reorder quick spawn tools
- Position: top, bottom, left, right. Orientation: horizontal or vertical.
- Visibility: always visible, auto-hide, hidden (hotkey reveal)

### 9b. Sticky Note Styles
- Legal pad: dual-column layout
- Canvas: freeform drawing surface, pen/touch input, brush/eraser

### 9c. Timer
- Countdown, stopwatch, pomodoro
- Spawns as a tile on the grid

### 9d. Media Controls
- Compact now-playing tile
- Play/pause, skip, track info
- Communicates with media sources (MPRIS on Linux)

### 9e. Tier 2 — Web App Pinning
- Pin any URL as a standalone slab window
- Iframe-based, sandboxed
- Gets its own tile and taskbar entry

### 9f. Tier 3 — X11 Bridge
- Xpra per-window streaming into slab windows
- Keyboard, mouse, clipboard, audio forwarding
- App launcher for installed GUI apps

---

## Phase 10 — Docker Awareness

### 10a. Environment Detection
- Backend detects Docker via `/.dockerenv` or cgroup markers
- `GET /api/shell/environment` returns runtime, mount status, PID namespace, hostname
- Frontend adapts UI based on environment

### 10b. Docker Settings Tab
- Shows mount status: home directory, `/proc`, `/sys`, PID namespace
- Each missing mount shows the `docker run` flag to fix it (copy-to-clipboard)
- Visual indicators: green (mounted), red (missing), yellow (read-only when read-write needed)

### 10c. Setup Tab Docker Mode
- Detect when install commands won't work (inside container)
- Show what needs host-side setup vs what's in the image
- Explain which dependencies need to be baked into the Dockerfile
- Replace broken install buttons with host-side instructions

### 10d. Recommended Docker Run
- Generate the full recommended `docker run` command based on current missing mounts
- One-click copy of the complete command

---

## Phase 11 — Multi-User and Deployment

### 11a. Multi-User
- Login screen
- Per-user config and data directories
- System settings require sudo (PAM verification)
- User management: create, delete, passwords, sudo, profile pictures

### 11b. Docker Image
- Official Docker image with all dependencies baked in
- Volume mounts for config, data, and host filesystem
- Single-command deployment with sensible defaults
