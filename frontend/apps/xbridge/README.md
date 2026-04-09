# X Bridge (System Apps)

Scans the system for installed GUI applications and launches them inside slab windows via Xpra.

## Features (Built)

- Scans `.desktop` files from `/usr/share/applications`, `~/.local/share/applications`, flatpak exports
- Groups apps by category (Internet, Development, Media, etc.)
- Displays apps with icons in a categorized grid
- Search/filter by name or description
- Launches apps via Xpra X11 forwarding into slab windows
- Proxies Xpra HTML5 client through slab to avoid CORS issues
- Shows Xpra status (installed/version)
- Setup prompt if Xpra not installed
- Auto-populates the tile grid with system apps on startup
- Live tile shows app count and bridge status

## Architecture

- **Backend:** `src/apps.rs` (desktop file scanning, icon serving) + `src/xbridge.rs` (Xpra session management, proxy)
- **Frontend:** This app module handles all UI — the shell has zero xbridge knowledge

## Capabilities

- `launchInXbridge(exec, name)` — other apps can request launching a GUI app via Xpra

## Requirements

- Xpra + xpra-html5 for GUI app streaming (optional — app browser works without it, just can't launch)
