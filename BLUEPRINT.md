# slab — Build Blueprint

Ordered build plan. Each phase builds on the previous. Items within a phase can be built in any order.

## What Exists

- Rust backend (axum + tokio) with file API, config API, system monitor API, media API, setup API, X11 bridge, terminal stub
- Frontend shell: window manager (drag, resize, minimize, maximize, snap), taskbar, Metro tile grid, file browser (sidebar, list/grid, previews, context menus, network places), settings app, theme system
- ~8K lines total (3K JS, 2.5K CSS, 2K Rust)

---

## Phase 1 — Shell Infrastructure

Build the two core surfaces that everything plugs into: the taskbar as a toolbar and the tile grid as a live home screen. No apps yet — just the framework ready to receive them.

### 1a. Taskbar Redesign
- Restructure: left side for open apps/workflow tabs, right side for quick spawn tools → settings button → clock
- Settings button opens popup panel (placeholder slots for volume, media, Wi-Fi, brightness)
- Quick spawn button group (initially empty/placeholder — app elements plug in later)
- Taskbar renders app entries and workspace entries identically (both are just "open things")

### 1b. Live Tile Grid
- Replace static start screen with live tile framework
- Tile size variants: small, medium, wide, large — each renders a different amount of content
- Fluid masonry layout with reflow when tiles resize
- Drag handles on tiles to resize, resizing pushes neighbors
- Tile positions persist in user config
- Tile data binding: tiles accept a data source and render live (poll or push)
- Running app state shown on tile (red border, active indicator)
- Click tile to open app or refocus if already running

---

## Phase 2 — Core Apps

Build the Tier 1 apps. Each plugs into the shell from Phase 1 — gets a tile on the grid, opens as a window from the taskbar. Order within phase doesn't matter.

### 2a. Terminal
- Websocket PTY backend (spawn real shell, bidirectional stream)
- Frontend terminal emulator (xterm.js integration or custom)
- Session persistence (survive page reloads)
- Multiple terminal tabs/instances
- Live tile: last few lines of output

### 2b. Text Editor
- Open files from file browser (double-click or context menu)
- Syntax highlighting (common languages)
- Save back to disk
- Unsaved changes indicator

### 2c. System Monitor
- Full app view: CPU/RAM/disk/network graphs over time
- Live tile: CPU, RAM, temps at a glance
- Process list (lower priority)
- Data from `/proc` via existing sysmon API

### 2d. Notes App
- Plain text notes, list + editor UI
- Create, edit, delete, rename
- Stored as `.txt` in `~/.config/slab/data/notes/`
- Tile preview (first lines of most recent note)

### 2e. Service Manager
- List systemd units (via D-Bus)
- Start, stop, restart, enable, disable
- Status indicators, failed unit alerts
- Live tile: green/red count of running vs failed

### 2f. Log Viewer
- journalctl streaming via websocket
- Filter by unit, priority, time range
- Search within logs
- Live tile: last critical/error entry

---

## Phase 3 — Quick Spawn

Wire up the taskbar spawn buttons now that apps exist to spawn elements from.

### 3a. Quick Spawn Framework
- Taskbar buttons that spawn app elements into the tile grid
- Spawned elements are tiles, not windows — they live on the grid
- Each spawn type is a slim, single-purpose piece of a full app

### 3b. Initial Spawn Elements
- **Sticky note** — blank text tile, header becomes filename, stored as `.txt`
- **Terminal** — single shell instance, optionally with preset command (blank, Claude, system update, custom user commands)
- **File browser** — single folder view, unscoped
- **Bookmark** — single pinned URL

### 3c. Sticky Note Features
- Spawn multiple, each as its own tile
- Stack multiple notes into tabbed tile or spread out
- Plain style first (legal pad + canvas in Phase 8)

---

## Phase 4 — Workspaces

The workflow system. Requires the shell (Phase 1) and apps (Phase 2) to be functional.

### 4a. Workspace Data Model
- Workspace definition format (`~/.config/slab/workspaces/*.json`)
- Define: scoped folders, bookmarks, terminal commands, tile layout, toolbar config
- Default workspace (full desktop, no scoping)

### 4b. Workspace Switching
- Workflows tile on the start grid lists saved workspaces
- Opening a workspace adds it to the taskbar like an app
- Focusing a workspace swaps the tile grid context
- Multiple workspaces open simultaneously on taskbar
- Standalone apps coexist alongside workspace tabs

### 4c. App Scoping
- File browser roots to workspace-defined folder, subfolders become sidebar entries
- Terminal opens in workspace-defined directory
- Bookmarks become standalone tiles per workspace
- Tile grid shows only workspace-relevant tiles

### 4d. Spawned Element Scoping
- Quick-spawned items belong to the active workspace
- Disappear when switching away, reappear when returning
- Desktop-mode spawns persist globally

### 4e. Per-Workflow Toolbar
- Each workspace overrides which quick spawn tools are visible on the taskbar
- Coding: terminal + file browser. School: sticky notes + timer.

---

## Phase 5 — Adaptive Tiles

Progressive disclosure and tile morphing. The workflow mode UX refinement.

### 5a. Dual-Mode App Rendering
- Apps detect context: desktop mode (full UI) vs workflow mode (slim tile variant)
- File browser slim mode: vertical folder list only, no toolbar/path bar
- Terminal slim mode: live output preview, click to expand
- Same components, conditional rendering

### 5b. Tile Morphing
- Click a slim file list → tile expands to full file browser
- Click a file → tile morphs to text editor or media viewer
- Back button steps back through morph history
- Tile resizes and reflows neighbors during morph

### 5c. Tile Spawning and Splitting
- Spawn second instance of a tile type (two file browsers side by side)
- Drag folder out of file tile to create new tile
- Auto-tiling arranges spawned tiles

---

## Phase 6 — Hybrid Tiling

Hyprland + iPadOS auto-tiling. Can be built alongside Phase 5.

### 6a. Auto-Tiling Engine
- Opening an app fills half the screen, tile grid compresses to other half
- Second app splits the space automatically
- Layout algorithm decides arrangement

### 6b. iPadOS Flexibility
- Drag dividers to adjust split ratios fluidly
- Not snapped to rigid presets — continuous resize

### 6c. Full-Screen and Dismissal
- Full-screen opt-in (double-click title bar or hotkey)
- Tile grid accessible via edge swipe or hotkey from full-screen
- Dismiss app → tiles reflow to fill space

---

## Phase 7 — Onboarding

### 7a. First Launch Flow
- Choice: "Set up a workspace" or "Just use it"
- Guided workspace builder: pick purpose, scope folders, pin URLs, pick tile layout
- Under a minute to complete

### 7b. Workspace Templates
- Pre-built templates: coding, school, server admin, media
- User selects and customizes

---

## Phase 8 — Polish and Extensions

Build in any order. Each is independent.

### 8a. Taskbar Customization
- Add, remove, reorder quick spawn tools
- Position: top, bottom, left, right. Orientation: horizontal or vertical.
- Visibility: always visible, auto-hide, hidden (hotkey reveal)
- Functionality: apps only, tools only, both, minimal

### 8b. Sticky Note Styles
- Legal pad: dual-column layout
- Canvas: freeform drawing surface, pen/touch input, brush/eraser

### 8c. Timer
- Countdown, stopwatch, pomodoro
- Spawns as a tile on the grid

### 8d. Media Controls
- Compact now-playing tile
- Play/pause, skip, track info
- Communicates with media sources (MPRIS on Linux)

### 8e. Tier 2 — Web App Pinning
- Pin any URL as a standalone slab window
- Iframe-based, sandboxed
- Gets its own tile and taskbar entry

### 8f. Tier 3 — X11 Bridge
- Xpra per-window streaming into slab windows
- Keyboard, mouse, clipboard, audio forwarding
- App launcher for installed GUI apps

---

## Phase 9 — Multi-User and Deployment

### 9a. Multi-User
- Login screen
- Per-user config and data directories
- System settings require sudo (PAM verification)
- User management: create, delete, passwords, sudo, profile pictures

### 9b. Docker Deployment
- Official Docker image
- Volume mounts for config and data
- Single-command deployment
