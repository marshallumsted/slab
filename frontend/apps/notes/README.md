# Notes

A lightweight per-workspace scratchpad. Not a full document editor — just fast plain text notes.

## Full App

- **Workspace-scoped:** Each workspace has its own notes. School notes don't clutter coding mode.
- **Plain text:** Stored as `.txt` files in `~/.config/slab/data/notes/{workspace}/`. No markdown rendering, no rich text — just text. Open them in any editor, copy them off the server, sync them with rsync.
- **Tile preview:** The notes tile on the grid shows the first few lines of the most recent note.
- **Simple UI:** List of notes on the left, content on the right. Create, edit, delete. That's it.
- **Pinboard view:** Full app shows all notes as a visual pinboard — cards arranged in a grid.

## Quick Spawn Element: Sticky Note

Spawns a single note tile onto the current context. The simplest expression of the app element concept.

- Spawn a blank tile from the taskbar. It's just an empty text area.
- Type a header — that becomes the filename.
- Type your note. Plain text. Done.
- Spawn as many as you want — each is its own tile on the grid.
- Stack multiple sticky notes into a single tile that you tab through, or spread them out as separate tiles.
- Spawned inside a workflow: stays in that workflow, disappears when switching away.

### Sticky Note Styles

- **Plain** — flat blank text. Quick thoughts, reminders, to-dos.
- **Legal pad** — dual-column layout. Comparison notes, pros/cons, key-value tables, structured data.
- **Canvas** — freeform drawing surface. Math work, diagrams, handwritten notes. Pen/touch input, basic brush/eraser.

## Data

```
~/.config/slab/data/notes/
  school/
    cs201.txt
    english-102.txt
  coding/
    slab-ideas.txt
  general/
    todo.txt
```

## Manifest

```json
{
  "id": "notes",
  "name": "Notes",
  "tile": { "color": "gray", "size": "normal" },
  "window": { "width": 600, "height": 450 },
  "scripts": ["notes.js"],
  "spawn": [
    { "id": "sticky-note", "label": "Sticky Note", "icon": "..." }
  ]
}
```
