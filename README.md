# [S] slab

A brutalist webtop — a full desktop environment in the browser.

Sharp edges. Flat blocks. Zero rounded corners. One Rust binary. One browser tab.

## Features

- **Desktop shell** — window manager with drag, resize, minimize, maximize
- **Floating taskbar** — centered, red, auto-sizes based on open apps
- **Metro start screen** — tile grid launcher
- **File browser** — sidebar, list/grid views, editable path bar
- **Image & video previews** — lazy-loaded, cached ffmpeg thumbnails
- **File operations** — rename, copy, cut, paste, delete, new folder/file, download
- **Selection** — click, ctrl+click, shift+click range select
- **Right-click menus** — context-aware actions everywhere
- **Network places** — SMB, SFTP, FTP, NFS, WebDAV source config
- **Settings** — centralized, per-app sections, performance toggles
- **Dark & Light themes** — fully tokenized, instant switch
- **Two-tier config** — system-wide (`/etc/slab`) + per-user (`~/.config/slab`)

## Install

### From source

```bash
git clone https://github.com/marshallumsted/slab.git
cd slab
cargo build --release
```

### Run

```bash
./target/release/slab
```

Open `http://localhost:8080` in your browser.

### Options

```bash
SLAB_PORT=3000 ./target/release/slab   # custom port
```

### Requirements

- Rust 1.70+
- ffmpeg (optional, for video thumbnails)

### Supported platforms

All major systemd-based Linux distributions:
Arch, Debian, Ubuntu, Fedora, openSUSE

## Planned

- Terminal (real shell via websocket)
- System monitor (live CPU/RAM/disk/network)
- Service manager (systemd)
- Log viewer (journalctl)
- Text editor with syntax highlighting
- Split-screen file browser
- Drag and drop
- Web app pinning (any URL as a window)
- X11 app streaming via Xpra
- Multi-user login screen
- User management (system users, sudo, profiles)
- Docker deployment

## Design

See [DESIGN.md](DESIGN.md) for architecture, design language, and detailed plans.

## Stack

Rust (axum + tokio) · HTML/CSS/JS · `/proc` · `/sys` · D-Bus · ffmpeg

## License

TBD
