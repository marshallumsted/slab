# [S] slab-base

The slab desktop environment. Pure Rust Wayland compositor.

This is the shell — the compositor, window manager, tiling engine, and bars. No apps included. Install slab apps as separate packages, or use any Wayland app.

## What's in the base

- **Wayland compositor** — Smithay, DRM/KMS output, boots from TTY
- **Window manager** — position, resize, focus, close, alt-tab, snap
- **Tiling engine** — Hyprland-style auto-tiling with iPadOS-style resize
- **Top bar** — clock, system icons (theme, volume, network), contextual app settings area
- **Bottom bar** — open windows, quick-spawn buttons (populated by installed slab apps)
- **Tile grid** — the home surface, replaces the desktop, masonry layout
- **Config system** — `~/.config/slab/`, theme, workspaces, settings persistence
- **App loader** — scans for installed slab apps, loads manifests, registers tiles and spawn entries
- **Theme engine** — design tokens (colors, fonts, spacing), dark/light
- **GPU rendering** — wgpu
- **Input** — libinput (keyboard, mouse, touchpad, touchscreen)
- **Multi-monitor** — DRM/KMS multi-head support

## What's NOT in the base

No file browser. No terminal. No editor. No system monitor. No settings panel. These are all separate packages:

| Package | Description |
|---------|-------------|
| [slab-web](https://github.com/marshallumsted/slab-web) | Remote browser access module |
| slab-terminal | Terminal emulator |
| slab-files | File browser |
| slab-editor | Text editor |
| slab-sysmon | System monitor |
| slab-notes | Notes and sticky notes |
| slab-settings | Settings panel |

Each app is a standalone Wayland application. It runs inside slab, or install it on KDE/GNOME — same binary.

## First boot with zero apps

You get: two bars, an empty tile grid, a clock. Open any Wayland app (Firefox, foot, Nautilus) and slab manages its window. That's a functional desktop.

## Design

- **0px border-radius.** No exceptions.
- **Flat solid colors.** No gradients, no shadows.
- **Bold type.** Instrument Sans + Space Mono.
- **Dense and information-heavy.**

See [DESIGN.md](DESIGN.md) for the full compositor architecture.

## Build

```bash
cargo build --release
```

### Requirements

- Rust 1.85+
- Wayland development libraries
- libinput, libudev, libgbm, libdrm

### Run

```bash
# from TTY (no existing DE)
./target/release/slab-base

# or install the systemd service
sudo cp slab-base.service /etc/systemd/system/
sudo systemctl enable slab-base
```

## License

TBD
