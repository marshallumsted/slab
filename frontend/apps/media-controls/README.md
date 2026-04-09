# Media Controls

Compact now-playing tile. Play/pause, skip, track info. Music runs across every workflow — you shouldn't have to leave what you're doing to skip a song.

## Quick Spawn Element

Spawns a small tile with:
- Track name and artist
- Play/pause button
- Skip forward/back
- Volume slider (optional)

## Backend

Communicates with media sources via MPRIS on Linux (D-Bus `org.mpris.MediaPlayer2`). Detects running players (Spotify, Firefox, VLC, etc.) and controls whichever is active.

## Manifest

```json
{
  "id": "media-controls",
  "name": "Media",
  "tile": null,
  "scripts": ["media-controls.js"],
  "spawn": [
    { "id": "media-controls", "label": "Media Controls", "icon": "..." }
  ]
}
```

No tile on the grid — spawn-only desk tool.
