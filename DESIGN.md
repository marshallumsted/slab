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

### Philosophy

Traditional desktops (Windows, macOS, Linux) all follow the same paradigm: a static desktop, a start menu/launcher, a taskbar, and floating windows. Widgets exist as an afterthought that nobody uses. Windows Phone and Windows 8 Metro got it right — every tile was a widget and an app launcher in one. Live data at a glance, one tap to go deeper. No separation between "seeing info" and "opening the app." slab takes that idea and builds on it.

### The Tile Grid is Home

There is no desktop. No wallpaper with scattered icons. The Metro-style tile grid is the always-visible home surface. You live on it. Tiles are live — they show real data, not static icons:

- **System monitor tile:** CPU, RAM, temps — right on the tile face
- **Services tile:** green/red count of running vs failed units
- **File manager tile:** recent files or current directory contents
- **Log viewer tile:** last critical/error entry
- **Terminal tile:** last few lines of output from a pinned session

Tiles are resizable in-place. Dragging a tile larger pushes its neighbors — fluid masonry layout, not a fixed grid. Small, medium, wide, large — each size shows progressively more live data.

### Hybrid Tiling: Hyprland Meets iPadOS

Opening an app does not take over the screen. Instead:

- **Half-screen default:** Tapping a tile opens the app on one half of the screen. The other half remains the live tile grid, compressed but still visible and interactive.
- **Auto-arrangement:** Apps tile themselves automatically like Hyprland — no manual window placement, no drag-to-position. The system decides the layout.
- **iPadOS flexibility:** You can adjust the split ratio by dragging the divider. Push an app to 70/30, or pull tiles back to 50/50. Fluid, not snapped to rigid presets.
- **Two-app split:** Open a second app and it shares the space — two apps side by side, or two apps with a tile strip. The system auto-arranges.
- **Full-screen is opt-in:** Double-tap the title bar or gesture to go full. The tile grid slides away but is always one gesture/key away from returning.
- **Dismissal:** Swipe an app away or close it and the tile grid flows back to fill the space.

### Navigation Flow

1. **Home state:** Full-screen tile grid. Live data everywhere. This is where you start and return.
2. **Glance:** Tiles show enough info that you often don't need to open an app at all.
3. **Open:** Tap a tile — app slides in on one side, tiles compress to the other. Quick task, quick info.
4. **Deep work:** Go full-screen on an app, or split two apps. Tile grid available via edge swipe or hotkey.
5. **Return:** Close/dismiss apps, tiles flow back. You're home.

### Open Problem: Spatial Consistency vs. Curation

Traditional taskbars work because of muscle memory — apps don't move, you know where they are without looking. The tile grid needs to offer that same stability, but there's a deeper tension:

Users want the aesthetic they see in marketing material — a beautifully curated live tile grid — but nobody actually wants to do the work of arranging it. Windows 8 asked users to drag and resize tiles into a personalized layout and most people never touched it. The default IS the experience for 90% of users. If the default grid looks bad or feels generic, the whole concept falls apart.

This means slab can't just provide flexibility and hope users curate. The system needs to:

- **Ship a grid that looks intentional out of the box** — not a dump of every installed app
- **Maintain spatial stability** — tiles don't shuffle when apps open/close, running state shows on the tile itself
- **Auto-curate without user effort** — smart defaults, maybe tiles that surface based on usage patterns, time of day, or system state
- **Not break the vibe when things change** — installing a new app or adding a tile shouldn't wreck the layout

No solution yet. This is a core design challenge: how to deliver the curated live-tile experience without making the user do interior decorating.

**Possible solution: Taskbar for persistence, tiles for exploration.** Keep the taskbar as the stable anchor — pinned apps live there, muscle memory intact, you always know where your running apps are. The tile grid becomes a live dashboard you return to, not your only way to find and launch things. Tiles can be flexible, rearrangeable, even auto-curated without anxiety — because your critical apps are always one click away on the taskbar regardless of what the grid looks like. This separates the "I need my app NOW" path (taskbar) from the "what's happening on my system at a glance" path (tiles).

### Input

- **Mouse/touch:** Tap tiles to open, drag dividers to resize splits, swipe to dismiss
- **Keyboard:** Hotkeys for home (tile grid), app switching, split direction, full-screen toggle
- **Edge gestures:** Swipe from edge to reveal tile grid when in full-screen app

### Workspaces as Workflow Modes

The real interaction model isn't "open apps and arrange windows." It's **workspaces** — predefined workflow modes that restore an entire working context in one click.

A workspace defines:

- **Which apps are open** and their split/tiling arrangement
- **Which URLs are loaded** (school tabs, GitHub, docs)
- **Which folders are navigated to** (project directory in file manager, repo in terminal)
- **Which tiles are visible** on the grid for that context
- **The layout** — how everything is arranged on screen

Examples:

- **School:** Browser tabs for Canvas/LMS front and center, school folder open in file manager, notes app in a side split. One click, you're in class.
- **Coding:** Terminal with Claude running, IDE open to your repo, GitHub in a panel, project folder in file manager. Every time, same layout, ready to go.
- **Server Admin:** System monitor, services, log viewer, terminal. Dashboard mode.

Workspaces don't just open apps — they **scope apps to the workflow.** Each workspace can override how apps behave:

- **File manager:** Root changes per workspace. School mode scopes the file browser to `~/School/` — that's the top level, no digging through unrelated folders. Coding mode scopes to `~/Projects/`. Sidebar pins swap to match — active classes in school mode, repositories in coding mode.
- **Web apps:** Bookmarked URLs become first-class apps within the workspace. Pin your school's LMS, Google Docs, lecture portal — they show up as standalone tiles/apps in that workspace, not buried in browser tabs. Coding mode gets GitHub, docs, CI dashboard.
- **Terminal:** Opens in the right directory. School mode drops you in your current assignment folder. Coding mode opens in your active repo.
- **Tiles:** The grid reshapes to show what matters. School mode tiles show assignment due dates, class schedule. Coding mode tiles show git status, CI results, open PRs.

### Adaptive Tiles

Tiles are not apps. They are not launchers for apps. **Tiles are the relevant parts of apps, composed together into a surface that fits your workflow.**

Traditional desktops force you to open full applications — a file manager with every feature, a browser with full chrome, a notes app with formatting toolbars — and you only use a fraction of each. Slab inverts this: tiles pull in just the pieces you need and morph as you interact with them. A tile that lists your repos IS the file browser — the part of it you actually use. Click deeper and it becomes more of the file browser. Click a document and it becomes the editor. You never "opened an app." The tile evolved to match what you were doing.

Because slab's native apps (file browser, text editor, media viewer, terminal, system monitor) are all custom-built, they can render in two modes:

- **Desktop mode:** Full-featured app windows — complete toolbar, sidebar, every option. Traditional desktop experience, nothing removed.
- **Workflow mode:** Slim, filtered tile variants — stripped to just the relevant UI for that workspace context. No toolbar clutter, no features you don't need. Same underlying app, different surface.

This isn't two separate codebases — it's the same app components rendering differently based on context. The file browser in desktop mode has every navigation option, view toggle, and context menu. The same file browser as a workflow tile shows a scoped folder list and nothing else until you need more.

**Progressive disclosure:** Tiles start minimal and morph as you drill in.

- **File browser tile** starts as a narrow vertical list — just your scoped folders (e.g., your GitHub repos). No toolbar, no path bar, no details. Click a repo and the tile expands to reveal the full file browser: sidebar, file list, path bar. Click a document inside and the tile morphs into the text editor or media viewer inline. Back button steps you back to files. The tile adapts to what you're doing.
- **Bookmarks tile** starts as a simple vertical list of your pinned URLs. Click one and the tile expands, launching the page via Tier 2 (iframe) or Tier 3 (X11 browser) right inside the tile space.
- **Terminal tile** starts as a small live preview of output. Click to expand into a full interactive terminal.

**Spawning and splitting:** You're not locked to one instance. From a file browser tile, you can spawn a second file tile to work side-by-side — drag a folder out to create a new tile, or use a split action. The auto-tiling system arranges them.

**Sticky notes** are the simplest expression of this:
- Spawn a blank tile from a widget library. It's just an empty text area.
- Type a header — that becomes the filename.
- Type your note. Plain text. Done.
- Spawn as many as you want — each is its own tile on the grid.
- Stack multiple sticky notes into a single tile that you tab through, or spread them out as separate tiles.

**Widget library:** A palette of spawnable tile types — sticky note, file browser, terminal, bookmark, system monitor widget. Drag one onto the grid to add it to your workspace. This is how you build up a workspace without an onboarding wizard if you prefer hands-on setup.

### Workspace Switching

The taskbar is the workspace switcher — not an app launcher. Each workspace is a tab on the taskbar. Click a tab, the entire context swaps. No app entries on the taskbar at all.

This works because within a workspace, the tile grid is lean. You don't need a taskbar full of app icons when your workspace only has five things in it:

- **Bookmarks are tiles, not browser tabs.** In school mode, your LMS, Google Docs, lecture portal — each is its own tile. No "open browser, find bookmark." The bookmark IS the app.
- **File browser tile is scoped and structured.** Set a root folder per workspace. In coding mode, root is `~/Projects/`. First-level subfolders (`~/Projects/slab/`, `~/Projects/dotfiles/`, etc.) become the sidebar entries. Click a project in the sidebar, its full file tree opens in the main content area. No navigating from `/home/` every time.
- **Terminal tiles are contextual.** A terminal tile in coding mode opens in your repo. A terminal tile in admin mode opens with monitoring tools running.
- **Running apps show on their tiles.** No taskbar app list needed — the tile shows it's active (red border, live output preview). Click to refocus.

The grid in workspace mode is small, curated, and fully relevant. Five to ten tiles, not fifty. Everything you need, nothing you don't. Alt-tab and keyboard shortcuts handle app switching within the workspace.

Switching workspaces swaps the entire context — apps, tabs, layout, tiles, and app scope — instantly. No opening six apps, no dragging windows around, no recreating your setup on a different machine. The workflow is the same everywhere because it's defined once and restored exactly.

### Onboarding

First launch offers a choice:

- **Set up a workspace** — guided flow to build your first workflow. Pick a purpose (school, coding, media, admin), choose folders to scope, bookmark URLs to pin as apps, pick a tile layout. Done in under a minute.
- **Just use it** — skip straight to the full default desktop. Traditional mode, no scoping, everything accessible. Build workspaces later if you want.

No one is forced into the workflow model. But for the users who want it, the onboarding makes it trivial to set up without manually editing config files.

This is the core value proposition for slab as a headless server/VM tool: you access it from any browser, on any machine, and your exact working environment is already there. Not just "your apps are installed" — your windows are arranged, your tabs are open, your folders are navigated, your apps are scoped to exactly what you need. You sit down and work.

## Architecture

### Three-Tier Application Model

**Tier 1 — Native slab apps**
Built-in apps written in web tech. Fast, lightweight, zero streaming overhead.

- Terminal (real shell via websocket)
- File manager (sidebar, grid/list views, image/video previews, network places)
- System monitor (CPU, RAM, disk, network)
- Service manager (systemd via D-Bus)
- Log viewer (journalctl stream)
- Text editor (syntax highlighting)
- Notes (per-workspace scratchpad, plain text storage)
- Settings (centralized — all app + system config)

**Tier 2 — Web apps as windows**
Any URL pinned as a standalone app. Iframe-based, sandboxed. No address bar, no tabs — each gets its own slab window, taskbar entry, and start screen tile.

**Tier 3 — X11 bridge**
Real native Linux GUI apps streamed into slab windows via Xpra. Per-window forwarding, keyboard/mouse/clipboard/audio forwarding.

### Shell

- **Window manager** — drag, resize, minimize, maximize, snap to edges/halves
- **Taskbar** — floating, centered, red, auto-sizes by open apps, [S] logo
- **Start screen** — Metro tile grid, live data tiles, app launchers
- **Right-click context menus** — system right-click suppressed globally
- **Drag and drop** — files, windows, between panes (planned)

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

All settings centralized in the Settings app (iPhone model):

- **Slab:** General (theme), Performance (animations, dot grid, blur)
- **Apps:** Files, Terminal, Editor, System Monitor, Services, Log Viewer — each app has its own section
- **System:** Network, About

No app has its own settings UI. Quick controls (like view toggle in Files) stay in-app, but configuration lives in Settings.

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
