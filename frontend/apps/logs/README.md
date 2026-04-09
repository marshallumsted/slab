# Log Viewer

Streaming journal log viewer. Real-time journalctl output with filtering and search.

## Status: Stub

Currently a placeholder UI. Needs real journalctl streaming.

## Planned

- journalctl streaming via websocket
- Filter by unit, priority (emergency → debug), time range
- Search within logs
- Color-coded priority levels
- Live tile: last critical/error entry
- `getData()` returns latest error for tile display

## Backend

Needs a new Rust module or extension to terminal websocket:
- `GET /api/logs` (websocket) — stream journal entries
- Query params: `unit`, `priority`, `since`, `until`, `grep`
