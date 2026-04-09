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

### Config System

Two-tier configuration:

**System config** (`/etc/slab/config.json`) — root-owned
- Performance defaults (admin-set floor for all users)
- Shared network places (visible to all users)
- `locked` array — setting keys users cannot override
- System language

**User config** (`~/.config/slab/config.json`) — per-user
- Desktop layout, tile arrangement
- Sidebar places, personal network places
- Theme choice, app-specific settings
- Performance overrides (unless system-locked)

`GET /api/config` returns a merged view with `locked[]` and `is_admin` flag. Locked settings show a LOCKED badge and greyed-out controls.

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
