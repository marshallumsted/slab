# Timer

Countdown, stopwatch, and pomodoro timer. Universal desk tool — everyone needs a timer regardless of workflow.

## Quick Spawn Element

Spawns as a compact tile on the grid. Modes:

- **Countdown** — set a duration, start. Exam timer, meeting countdown.
- **Stopwatch** — start/stop/lap. Track time on a task.
- **Pomodoro** — 25min work / 5min break cycle. Focus sessions.

## UI

Minimal tile: large time display, start/pause/reset buttons. No chrome, no menus. The tile IS the timer.

## Manifest

```json
{
  "id": "timer",
  "name": "Timer",
  "tile": null,
  "scripts": ["timer.js"],
  "spawn": [
    { "id": "timer", "label": "Timer", "icon": "..." }
  ]
}
```

No tile on the grid — timer only exists when spawned. It's a pure desk tool, not an app you launch from a tile.
