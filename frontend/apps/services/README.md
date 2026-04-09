# Services

Systemd service manager. List, start, stop, restart, enable, disable system services.

## Status: Stub

Currently a placeholder UI. Needs real systemd interface via D-Bus.

## Planned

- List systemd units via D-Bus (`org.freedesktop.systemd1`)
- Start, stop, restart, enable, disable
- Status indicators (running/stopped/failed)
- Failed unit alerts
- Live tile: green/red count of running vs failed
- `getData()` returns service counts for tile display

## Backend

Needs a new Rust module (`src/services.rs`) that talks to systemd via D-Bus:
- `GET /api/services` — list units with status
- `POST /api/services/action` — start/stop/restart/enable/disable a unit
