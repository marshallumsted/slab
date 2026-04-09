# Bookmarks

Pinned URLs as standalone apps. No browser chrome, no tabs — each bookmark gets its own tile and window.

## Quick Spawn Element

Spawns a single pinned URL tile. Click to open the page inline via iframe (Tier 2) or X11 browser (Tier 3).

## Full App

A bookmark manager where you organize, add, and remove bookmarked URLs. Bookmarks can be:
- Global (available in all workspaces)
- Workspace-scoped (only visible in a specific workflow)

## Workflow Integration

In a workspace, bookmarks become the primary way to access web apps:
- School mode: Canvas, Google Docs, lecture portal — each is its own tile
- Coding mode: GitHub, CI dashboard, documentation
- No "open browser, find bookmark" — the bookmark IS the app

## Manifest

```json
{
  "id": "bookmarks",
  "name": "Bookmarks",
  "tile": { "color": "gray", "size": "normal" },
  "window": { "width": 500, "height": 400 },
  "scripts": ["bookmarks.js"],
  "spawn": [
    { "id": "bookmark", "label": "Bookmark", "icon": "..." }
  ]
}
```
