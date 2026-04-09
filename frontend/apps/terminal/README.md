# Terminal

Real shell via websocket PTY. Full terminal emulator with tabs and split panes.

## Features (Built)

- Websocket PTY backend (spawn real shell, bidirectional stream)
- xterm.js frontend with FitAddon and WebLinksAddon
- Multiple tabs
- Split panes (horizontal/vertical with draggable dividers)
- Focus tracking per pane
- Dark/light theme support
- Session cleanup on window close

## Quick Spawn Element

Spawns a single shell instance, optionally with a preset command:
- Blank shell
- Claude terminal (opens with `claude` running)
- System update terminal (opens with `apt upgrade` started)
- Custom user-defined commands — save your own quick-run commands for one-click access

## Cross-App Capabilities

- `openTerminalWithCommand(cmd)` — opens a terminal window with a command pre-typed. Used by Settings app for package installs.

## Planned

- Session persistence (survive page reloads)
- Terminal presets configurable in manifest
