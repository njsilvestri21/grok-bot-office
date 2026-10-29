# Grok Bot Office

Live isometric 3D dashboard of the Grok Bot team (Three.js r160 vendored in `vendor/`, works offline).

## Run
    cd /workspace/grok-office && python3 -m http.server 8765
Open http://localhost:8765/

URL options: `?light=day|evening|night` · `?bubbles=all` (task bubbles for every working bot) · `?zoom=1.8` (initial zoom, 0.7–4) · `?static` (frozen office, no live layer)
· `?feed=URL&interval=3000` (poll JSON) · `?ws=ws://host:port` (WebSocket). Default is mock mode.
Click a bot (or a team row) to focus it; mouse wheel zooms.

## Files
- `index.html`, `style.css` – layout, panels, overlay
- `js/office.js` – scene, furniture, characters, per-status animation
- `js/data.js` – data adapter (mock / feed / ws) and the team list
- `js/app.js` – glue: panels, bubbles, approve/decline, render loop

## JSON schema
Snapshot (feed response, or any WS message containing `bots`):
```json
{ "bots": [ { "id": "patchwork", "name": "Patchwork", "role": "Coding",
  "status": "coding", "task": "Fixing a failing test", "request": null,
  "updatedAt": 1761746400000 } ] }
```
`status` ∈ `coding | browsing | thinking | needs_you | idle | error | done`. `request` is the question shown on `needs_you`.
`updatedAt` is epoch ms. `id` must match an id in `js/data.js` TEAM (unknown ids are ignored).

WebSocket event messages (server → client):
```json
{ "type": "status", "id": "mail", "status": "needs_you", "task": "...", "request": "Send reply?", "at": 1761746400000 }
{ "type": "log", "id": "mail", "text": "Sent 3 replies" }
```
Client → server (WS only), sent on Approve/Decline:
```json
{ "type": "decision", "id": "mail", "approved": true, "request": "Send reply?", "at": 1761746400000 }
```
`done` automatically falls back to `idle` after 2.5 s.

## Screenshots
`shots/` – regenerate with `node shots/shot.js <url> <out.png>` (needs `playwright-core` + Chrome; uses SwiftShader WebGL).
