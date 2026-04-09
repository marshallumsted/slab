# Files

Full-featured file browser with sidebar, list/grid views, and network places.

## Features (Built)

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

## Planned

- Split-screen file browser (dual panes)
- Full drag and drop (files between panes, to/from desktop, reorder sidebar)

## Workflow Mode

In a workspace, the file browser scopes to a root folder:
- Coding mode roots to `~/Projects/`, first-level subfolders become sidebar entries
- School mode roots to `~/School/`
- No navigating from `/home/` every time

## Quick Spawn Element

Spawns a single folder view — no sidebar, no toolbar, just a file list. Click deeper to expand into the full browser. Click a document to morph into editor/viewer.

## Cross-App Capabilities

- Uses `Slab.request('openFileInEditor', path)` to open text files
- Uses `Slab.request('openMediaViewer', folder, filename)` to open images/video
