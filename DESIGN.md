# slab — Design Document

## Vision

A brutalist webtop that combines cockpit-style server management with a full virtual desktop. One Rust binary, one browser tab, a complete desktop environment. Inspired by Windows 8 Metro and brutalist architecture.

## Design Principles

- **0px border-radius.** No exceptions.
- **Flat solid colors.** No gradients, no shadows.
- **Bold type.** Instrument Sans + Space Mono. High contrast.
- **Dense and information-heavy.** No wasted whitespace.
- **Sharp, blocky, unapologetic.**
- **iPhone settings philosophy.** All configuration centralized in one Settings app.

## Design Language

Pulled from the portfolio project. Key tokens:

- **Palette:** `#000` / `#fff` / `#e63227` (accent red) / gray scale from `#111` to `#e0e0e0`
- **Fonts:** Instrument Sans (UI), Space Mono (labels, data, code)
- **Labels:** Mono, uppercase, letter-spaced, red dot indicator
- **Tiles:** Metro grid with 3px gaps, three variants (gray, white, red)
- **Hover:** Background shift + subtle translate
- **Dividers:** Dashed via repeating-linear-gradient
- **Dot grid:** Subtle radial-gradient background overlay

### Themes

Dark (default) and Light. All colors defined as CSS variables on `:root`, overridden by `body.theme-light`. The red accent and taskbar remain consistent across themes.

## Interaction Model

slab is designed for headless servers and VMs — access from any browser, on any machine, and your working environment is already there. Not just apps installed, but your workflow restored exactly.

### Core Concept

**Build an app for your task.** A workflow is a custom app — assembled from tiles, scoped folders, pinned bookmarks, and terminals — that you open like any other app. One click and your entire working context is there: the right files, the right tabs, the right tools, already arranged. You're building a personal app for "school" or "coding" or "server admin" the same way you'd pin an app to your taskbar — except this one does exactly what you need because you made it.

Or don't. slab works as a regular desktop out of the box. Workflows are opt-in power.

### Features

**Two Modes**

- **Desktop mode:** Traditional full-featured app windows. Complete toolbar, sidebar, every option. The familiar model — works out of the box, no setup required.
- **Workflow mode:** Workspace-driven. Apps render as slim, scoped tile variants stripped to the relevant UI. Same app components, different surface based on context.

**Live Tile Grid**

The tile grid replaces the desktop. No wallpaper, no scattered icons — live tiles showing real data: CPU/RAM on the system monitor tile, running/failed service counts, recent files, last log entry, terminal output. Tiles are resizable in-place with fluid masonry reflow.

**Adaptive Tiles (Workflow Mode)**

Tiles morph through progressive disclosure:
- **Files tile** — starts as a vertical list of scoped folders (e.g., your repos). Click one → expands to a file browser. Click a document → morphs into text editor or media viewer. Back button steps back. Never "opened an app."
- **Bookmarks tile** — starts as a URL list. Click one → expands and loads the page inline via iframe or X11 bridge.
- **Terminal tile** — starts as a live output preview. Click → full interactive terminal.
- **Sticky notes** — spawn blank tiles from a widget library. Type a header (becomes filename), type plain text. Spawn multiples, stack them, or spread across the grid.

**Workspaces**

Predefined workflow modes. One click restores an entire context:
- Apps, layout, and tiling arrangement
- Scoped folders (file browser roots to `~/School/` or `~/Projects/`, first-level subfolders become sidebar entries)
- Bookmarked URLs as standalone tiles (not browser tabs)
- Terminals opened in the right directory
- Contextual tile grid (only relevant tiles, five to ten, not fifty)

**Workspace Switching**

Workspaces are not virtual desktops. macOS Spaces, Windows Task View, and KDE Activities just shuffle which windows are visible — the apps stay the same, the files stay the same, you're just hiding and showing windows. slab workspaces change what's underneath: different files in the file browser, different directory in the terminal, different bookmarks, different tiles, different toolbar tools. It's not "desktop 2 has my code windows." It's "the entire environment is shaped for coding."

Workspaces are apps. On the tile grid, a "Workflows" tile lists your saved workspaces. Click one and it opens on the taskbar like any other app. The focused workspace sets the tile grid layout on the main screen behind it.

- Multiple workspaces can be open on the taskbar simultaneously — school and coding side by side
- Switching focus between them swaps the tile grid context
- Standalone apps (Spotify, a browser, a terminal) also open on the taskbar independently — they're not tied to any workspace
- The taskbar mixes workspaces and standalone apps freely — click between them like alt-tabbing
- Closing a workspace removes it from the taskbar, opening it again restores the full context

**Hybrid Tiling (Workflow Mode)**

Auto-tiling inspired by Hyprland with iPadOS flexibility:
- Opening a tile fills half the screen; the other half stays as the tile grid
- Second app splits the space automatically
- Drag dividers to adjust split ratios fluidly
- Full-screen is opt-in, tile grid always one gesture/hotkey away
- Dismiss an app and tiles reflow to fill the space

**Quick Spawn**

Quick Spawn doesn't spawn apps — it spawns **app elements.** The distinction matters: every spawnable item is a single piece pulled from a full app. The full app still exists for when you need it.

- **Sticky note** → spawns a single note tile. The full Notes app is a pinboard showing all your notes organized. Quick Spawn just drops one note onto your current screen.
- **Terminal** → spawns a single shell, optionally with a preset command. Quick-spawn a Claude terminal (opens with `claude` running), a system update terminal (opens with `apt upgrade` started), a blank shell, or any user-defined custom command. Users save their own quick-run commands for one-click access. The full Terminal app manages sessions, tabs, history.
- **File browser** → spawns a single folder view. The full Files app has sidebar, navigation, network places.
- **Bookmark** → spawns a single pinned URL. The full Bookmarks lives in Settings or a dedicated manager.
- **Timer** → countdown, stopwatch, pomodoro. Exam timer, meeting countdown, focus sessions. Universal across school, coding, admin — everyone needs a timer.
- **Media controls** → compact now-playing tile. Play/pause, skip, track info. Music runs across every workflow — you shouldn't have to leave what you're doing to skip a song.

These are the items that earn permanent muscle memory on the taskbar. Workflow-specific elements (service toggles, log tails, code snippets) belong inside their respective workflows, not in the universal quick spawn.

This reinforces the core concept: tiles are app elements, not apps. Quick Spawn is the fast lane to drop an element into your workflow without opening the full app.

Quick Spawn lives on the taskbar — fixed position, same muscle memory from any screen. Spawned items belong to the current context: spawn a sticky note inside a workflow and it stays in that workflow, disappearing when you switch away and reappearing when you return. Spawn one in desktop mode and it lives on the desktop.

**Sticky note styles:**
- **Plain** — flat blank text. Quick thoughts, reminders, to-dos.
- **Legal pad** — dual-column layout. Comparison notes, pros/cons, key-value tables, structured data.
- **Canvas** — freeform drawing surface. Math work, diagrams, handwritten notes. Pen/touch input, basic brush/eraser.

These aren't workspace-specific. They're desk tools — the stuff that's always within reach no matter what task you're in.

**Taskbar Layout**

**Two bars:**

- **Top bar:** Menu bar with contextual app settings, system menus. When an app is focused, its declared settings appear here automatically. The desktop renders them — apps just provide data. Also holds system-level items (clock, notifications).
- **Bottom bar (taskbar):** The toolbar. Left = open apps and workflow tabs. Right = Quick Spawn tools → Clock.

The top bar is for information and configuration. The bottom bar is for actions and switching.

The bottom taskbar is fully user-customizable:
- **Tools:** Add, remove, reorder quick spawn items.
- **Layout:** Top, bottom, left, or right edge. Horizontal or vertical.
- **Visibility:** Always visible, auto-hide, or hidden (keyboard shortcut to reveal).
- **Per-workflow tools:** Each workflow can override which quick spawn tools are visible. Coding mode shows terminal and file browser spawns. School mode shows sticky notes and timer.

Data displays (CPU, RAM, disk, network, service status) belong on the tile grid as live Metro tiles — not crammed into the taskbar. The taskbar is for actions. The tiles are for information.

**Onboarding**

First launch: "Set up a workspace" (guided — pick purpose, scope folders, pin URLs, under a minute) or "Just use it" (full desktop mode, build workspaces later).

### Flows

1. **Desktop mode:** Launch slab → full tile grid as start screen → click tile → app opens as a full window → taskbar shows workspaces + standard window management
2. **Workflow mode:** Switch workspace tab → scoped tile grid loads (five to ten tiles) → interact with tiles inline (files, bookmarks, terminal morph in-place) → spawn/split tiles as needed → switch workspace to swap entire context
3. **Glance → drill → return:** See live data on tiles → tap to expand for detail → tap deeper to morph into editor/viewer → back out → tiles reflow home

### Open Issues

**Spatial consistency vs. curation.** Taskbars work because apps don't move — muscle memory. The tile grid needs that stability, but users won't manually arrange tiles. Windows 8 proved this: nobody curates their Start screen. The default IS the experience. If the default looks bad, the concept fails. The system must ship intentional layouts, maintain tile positions through state changes, and auto-curate without user effort. Partial solution: the taskbar handles persistence (workspace tabs are fixed), tiles handle exploration (flexible, less pressure to be perfect).

**Desktop-first interaction.** Windows 8 failed because Metro was designed for touch, not mouse and keyboard. slab is primarily a desktop/browser tool. All tile interactions — morphing, expanding, dismissing, splitting — must feel natural with a cursor. Hover states, right-click context menus, keyboard shortcuts, and edge snapping are required. Touch is secondary.

**App discovery.** With no app entries on the taskbar and a scoped workspace grid, how does a user find and open something outside their current workflow? Needs an "all apps" action or search without breaking the workspace model.

## Architecture

### App Architecture

**Apps are web components.** Each app is a custom element (`<slab-terminal>`, `<slab-files>`, `<slab-sysmon>`) with self-contained HTML, CSS, and JS. Shadow DOM provides CSS isolation. The shell drops components into windows, tiles, or workflow layouts without knowing anything about the app's internals.

```
frontend/apps/
  terminal/
    manifest.json       # metadata: name, tile config, spawn entries, dependencies
    terminal.js         # defines <slab-terminal> custom element
  sysmon/
    manifest.json
    sysmon.js           # defines <slab-sysmon> custom element
  files/
    manifest.json
    files.js            # defines <slab-files> custom element
  ...
```

**Adding an app = dropping a folder. Removing = deleting it.** The shell discovers apps via `GET /api/shell/apps` (backend scans `frontend/apps/*/manifest.json`). If every app is deleted, the desktop still works — empty tile grid, empty taskbar, clock ticking.

**Design tokens live in the desktop.** `design.css` defines CSS custom properties (`--red`, `--gray-800`, `--font-mono`, etc.). These pass through shadow DOM boundaries, so apps use `var(--red)` and inherit the theme automatically. Apps never define their own colors or fonts — they consume the desktop's design language.

**Apps expose data, not just UI.** Each app component exposes a `getData()` method that returns its current state. This is the single source of truth:

- The **live tile** calls `getData()` to render a summary (CPU %, file count, service status)
- The **full app window** renders the complete UI from the same data
- **Other apps** can query any app's data via `Slab.query('sysmon')` to pull from it
- **Workflow tile elements** render a slim view of the same data

The data layer means the System Monitor tile, the System Monitor window, and a workflow element showing CPU in a corner all read from the same place.

**Cross-app communication** uses a capability system. Apps register capabilities (`openTerminalWithCommand`, `openFileInEditor`) and other apps request them through the shell: `Slab.request('openTerminalWithCommand', cmd)`. If the providing app isn't installed, the request returns undefined — nothing breaks.

### Three-Tier Application Model

**Tier 1 — Native slab apps (web components)**
Custom elements in `frontend/apps/`. Self-contained, fast, zero streaming overhead. Each registers with the shell on load.

**Tier 2 — Web apps as windows**
Any URL pinned as a standalone app. Iframe-based, sandboxed. No address bar, no tabs — each gets its own slab window and tile.

**Tier 3 — X11 bridge**
Real native Linux GUI apps streamed into slab windows via Xpra. Per-window forwarding, keyboard/mouse/clipboard/audio forwarding.

### Shell

The shell is the host. It owns:

- **Window manager** — drag, resize, minimize, maximize, snap to edges/halves
- **Taskbar** — toolbar with open apps, dynamic spawn buttons (from app manifests), settings popup, clock
- **Tile grid** — live data tiles, always-visible desktop surface, built from app manifests
- **App loader** — discovers apps, loads scripts/styles, manages registration
- **Slab API** (`window.Slab`) — register, createWindow, query data, request capabilities, event bus
- **Right-click context menus** — system right-click suppressed globally
- **Drag and drop** — files, windows, between panes (planned)

No app code lives in the shell. The shell has zero knowledge of what apps exist.

### User Data Model

Each user on the system gets a single slab directory that holds everything — config and content:

```
~/.config/slab/
├── config.json              # user preferences, theme, performance
├── workspaces/
│   ├── school.json          # workspace definition (apps, layout, scoped folders, bookmarks)
│   ├── coding.json
│   └── default.json
└── data/
    ├── notes/
    │   ├── school/          # notes scoped to school workspace
    │   │   ├── cs201.txt
    │   │   └── english-102.txt
    │   ├── coding/          # notes scoped to coding workspace
    │   │   └── slab-ideas.txt
    │   └── general/         # unscoped notes
    │       └── todo.txt
    └── thumbs/              # cached thumbnails
```

All user-generated content lives under `data/`. Notes are plain `.txt` files — no proprietary format, no database. Users can browse, import, and export them as regular files. Each workspace gets its own notes folder so notes stay contextual.

### Config System

Two-tier configuration:

**System config** (`/etc/slab/config.json`) — root-owned
- Performance defaults (admin-set floor for all users)
- Shared network places (visible to all users)
- `locked` array — setting keys users cannot override
- System language

**User config** (`~/.config/slab/config.json`) — per-user
- Desktop layout, tile arrangement, workspace definitions
- Sidebar places, personal network places
- Theme choice, app-specific settings
- Performance overrides (unless system-locked)

`GET /api/config` returns a merged view with `locked[]` and `is_admin` flag. Locked settings show a LOCKED badge and greyed-out controls.

### Notes App

A lightweight per-workspace scratchpad. Not a full document editor — just fast plain text notes.

- **Workspace-scoped:** Each workspace has its own notes. School notes don't clutter coding mode.
- **Plain text:** Stored as `.txt` files in `~/.config/slab/data/notes/{workspace}/`. No markdown rendering, no rich text — just text. Open them in any editor, copy them off the server, sync them with rsync.
- **Tile preview:** The notes tile on the grid shows the first few lines of the most recent note.
- **Simple UI:** List of notes on the left, content on the right. Create, edit, delete. That's it.

### Settings Philosophy

macOS menu bar approach — the desktop owns the settings UI, apps just declare data.

**App settings live in the desktop menu, not a settings app.** When an app is focused, its settings appear in the desktop's menu bar automatically. The app declares settings as data in its manifest:

```json
"settings": [
  { "key": "font_size", "name": "Font Size", "type": "select", "default": "14",
    "options": [["12","12px"],["14","14px"],["16","16px"]] },
  { "key": "bold_is_bright", "name": "Bold is Bright", "type": "toggle", "default": true }
]
```

The desktop renders consistent toggles, dropdowns, and labels — same look everywhere. Apps never build settings UI. Focus Terminal → terminal settings appear. Focus Files → file browser settings appear. No app focused → system settings only.

**The Settings app handles system-level only:**
- Theme (dark/light)
- Performance (animations, dot grid, blur)
- Setup (dependencies, install)
- Network, About

Per-app settings sections are gone — the menu bar handles them contextually.

### Multi-User (Planned)

- Login screen for different users
- Per-user desktops and configs
- System-level settings require sudo (verified via PAM)
- User management: create/delete users, passwords, sudo permissions, profile pictures
- Each user session loads their own `~/.config/slab/config.json`

## Stack

- **Backend:** Rust (axum + tokio)
- **Frontend:** HTML/CSS/JS (vanilla, no framework)
- **System interfaces:** `/proc`, `/sys`, D-Bus (systemd)
- **Thumbnails:** ffmpeg (video frame extraction, cached in `~/.cache/slab/thumbs/`)
- **X11 bridge:** Xpra (optional, for Tier 3)
- **Deployment:** single binary, or Docker

## Target Platforms

All major systemd-based Linux distributions:
- Arch, Debian, Ubuntu, Fedora (RHEL/CentOS), openSUSE

No distro-specific code — talks to kernel interfaces (`/proc`, `/sys`) and systemd (D-Bus).

## File Browser Design

- Left sidebar: Places (user-editable), System, Network
- Main pane: list or grid view, column headers (name, size, modified)
- Dolphin-style path bar: click breadcrumbs or click to type a path
- Image/video previews: lazy-loaded via IntersectionObserver, fade in/out on scroll
- Video thumbnails: ffmpeg frame extraction, cached with path+mtime hash
- Selection: click (select), ctrl+click (toggle), shift+click (range)
- Folders: single-click opens. Files: single-click selects, double-click actions.
- Right-click context menus: rename, copy, cut, paste, delete, download, copy path, add to places
- Network places: SMB, SFTP, FTP, NFS, WebDAV source configuration
- All file operations: rename, copy (recursive), move, delete, mkdir, touch, download

## Planned Features

- Split-screen file browser (dual panes)
- Full drag and drop (files between panes, to/from desktop, reorder sidebar)
- Terminal (xterm.js or custom, real shell via websocket PTY)
- System monitor (live /proc stats, tile dashboard)
- Service manager (systemd list/start/stop/restart via D-Bus)
- Log viewer (journalctl streaming via websocket)
- Text editor (syntax highlighting, file save)
- Tier 2 web app pinning (URL → window → tile)
- Tier 3 X11 bridge (Xpra per-window streaming)
- User management and login screen
- Docker deployment image
- System language settings
