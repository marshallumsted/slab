# slab-base — Design Document

The base desktop environment. Wayland compositor, window manager, shell chrome, app loader. No apps included.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     slab-base                          │
│                                                        │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Compositor   │  │ Renderer │  │ App Loader       │  │
│  │ (Smithay)    │  │ (wgpu)   │  │                  │  │
│  │              │  │          │  │ Scans installed  │  │
│  │ DRM/KMS      │  │ Shell    │  │ slab-* packages  │  │
│  │ libinput     │  │ chrome   │  │ Loads manifests  │  │
│  │ Wayland      │  │ Tiles    │  │ Registers tiles  │  │
│  │ protocol     │  │ Bars     │  │ + spawn entries  │  │
│  └──────────────┘  └──────────┘  └──────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Window Manager                      │   │
│  │  Focus · Resize · Tiling · Alt-tab · Snap        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────┐  ┌───────────────────────────┐   │
│  │ Config System     │  │ Theme Engine              │   │
│  │ ~/.config/slab/   │  │ Design tokens             │   │
│  │ Workspaces        │  │ Dark/Light                │   │
│  │ Settings           │  │ Colors, fonts, spacing    │   │
│  └──────────────────┘  └───────────────────────────┘   │
└────────────────────────────────────────────────────────┘
         │                              │
    Wayland clients                Slab app packages
    (any app: Firefox,             (slab-terminal,
     foot, Steam, etc.)             slab-files, etc.)
```

## What slab-base does

### Compositor (Smithay)
- DRM/KMS output — detect monitors, set resolution, multi-head
- libinput — keyboard, mouse, touchpad, touchscreen
- Wayland protocol — xdg_toplevel, xdg_popup, layer_shell
- Session — boots from TTY, no login manager required

### Window Manager
- Position, resize, focus, close windows
- Alt-tab window switching
- Tiling engine: Hyprland-style auto-arrange, iPadOS-style drag-to-resize splits
- Full-screen opt-in, tile grid always one hotkey away
- Window snapping to edges/halves

### Shell Chrome (rendered by wgpu)
- **Top bar** — left: contextual app settings (populated by focused slab app's manifest). Right: system icons (theme toggle, volume, network, clock)
- **Bottom bar** — left: open windows / workflow tabs. Right: quick-spawn buttons (populated by installed slab apps)
- **Tile grid** — home surface behind windows. Live tiles from installed slab apps. Masonry layout. Click to launch.

### App Loader
- Scans for installed slab app packages (e.g. `slab-terminal`, `slab-files`)
- Each slab app installs a manifest to `~/.local/share/slab/apps/{id}/manifest.json` or `/usr/share/slab/apps/{id}/manifest.json`
- Manifest declares: name, tile config (color, size), settings, spawn entries, binary path
- The compositor loads manifests, populates the tile grid and spawn buttons
- Zero apps installed = functional empty desktop with just bars and tile grid

### Config System
- `~/.config/slab/config.json` — theme, performance, workspace definitions
- `/etc/slab/config.json` — system-wide defaults, locked settings
- Same config format as slab-web — portable between native and remote

### Theme Engine
- Design tokens as Rust constants: colors, fonts, spacing
- Same values as slab-web's CSS variables
- Dark (default) and Light themes
- Palette: `#000` / `#fff` / `#e63227` (accent red) / gray scale
- Fonts: Instrument Sans (UI), Space Mono (labels, data, code)

## App Manifest Format

```json
{
  "id": "terminal",
  "name": "Terminal",
  "bin": "slab-terminal",
  "tile": { "color": "gray", "size": "wide" },
  "settings": [
    { "key": "font_size", "name": "Font Size", "type": "select", "default": "14",
      "options": [["12","12px"],["14","14px"],["16","16px"]] }
  ],
  "spawn": [
    { "id": "terminal", "label": "Terminal", "icon": "terminal" }
  ],
  "data_socket": "/run/slab/terminal.sock"
}
```

- `bin` — the binary to execute when launching the app (must be a Wayland client)
- `data_socket` — optional Unix socket where the app serves live data for its tile
- `settings` — same declarative format as slab-web, rendered by the top bar
- `spawn` — quick-spawn entries for the bottom bar

## Slab App Interface

Slab apps are standalone Wayland applications. They don't link against slab-base — they're just normal programs that happen to also provide:

1. **A manifest** — installed to a known location, tells slab-base about the app
2. **A data socket** (optional) — Unix socket serving JSON for live tile updates
3. **Declared settings** (optional) — in the manifest, rendered by the top bar

Any app that provides a manifest is a "slab app." Any Wayland client that doesn't is still a regular window — it just doesn't get a tile or settings integration.

## Why Smithay

- Pure Rust — no C bindings
- Built for custom Wayland compositors
- Handles DRM/KMS, libinput, EGL, Wayland protocol
- Used by COSMIC desktop (System76), actively maintained
- Same language as the rest of slab

## Rendering

All shell chrome rendered via wgpu:
- Tile grid background with masonry layout
- Top and bottom bars
- Window decorations (title bar, controls)
- Context menus, popups

Text rendering via cosmic-text or fontdue + wgpu.

App content is rendered by the apps themselves (they're Wayland clients — they draw their own windows).

## Boot Sequence

1. systemd starts `slab-base.service` on TTY
2. Initialize DRM/KMS (detect monitors, set resolution)
3. Start libinput (keyboard, mouse)
4. Start Wayland socket
5. Render shell chrome (bars, empty tile grid)
6. Scan app manifests, populate tile grid and spawn buttons
7. Ready — user sees the slab desktop

## Project Structure

```
src/
  main.rs           # entry point, calloop event loop
  compositor.rs     # Smithay compositor setup, Wayland protocol
  backend.rs        # DRM/KMS output, monitor management
  input.rs          # libinput handling, keybindings
  renderer.rs       # wgpu rendering pipeline
  shell/
    mod.rs          # shell chrome coordinator
    topbar.rs       # top menu bar rendering + logic
    taskbar.rs      # bottom taskbar rendering + logic
    tilegrid.rs     # tile grid layout + rendering
    window.rs       # window decorations, stacking, focus
    tiling.rs       # auto-tiling engine
  config.rs         # config system, workspace definitions
  theme.rs          # design tokens, dark/light
  apps.rs           # app manifest loader, data socket listener
Cargo.toml
```

## Dependencies

```toml
[dependencies]
smithay = { version = "0.3", features = ["backend_drm", "backend_libinput", "wayland_frontend"] }
wgpu = "24"
calloop = "0.14"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
cosmic-text = "0.12"    # text shaping + rendering
```

## Milestone Path

1. **Bare compositor** — blank screen, handles input, can spawn and display foot/alacritty
2. **Window management** — position, resize, focus, close, alt-tab
3. **Shell chrome** — render top bar, bottom bar, tile grid (empty)
4. **App loader** — scan manifests, populate tiles and spawn buttons
5. **Tiling engine** — auto-arrange, split ratios, full-screen toggle
6. **Theme** — dark/light, design tokens applied to all chrome
7. **Config** — persist layout, workspaces, settings
8. **Multi-monitor** — detect and manage multiple outputs
9. **Session** — TTY boot, lock screen, user switching

## Ecosystem

| Package | Description | Status |
|---------|-------------|--------|
| slab-base | Compositor + shell | This repo |
| [slab-web](https://github.com/marshallumsted/slab-web) | Remote browser access | Working |
| slab-terminal | Terminal emulator | Planned |
| slab-files | File browser | Planned |
| slab-editor | Text editor | Planned |
| slab-sysmon | System monitor | Planned |
| slab-notes | Notes / sticky notes | Planned |
| slab-settings | Settings panel | Planned |
