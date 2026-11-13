# Image comments

Figma-style comments on an image. Click anywhere on the image to start a
comment thread pinned to that exact spot, drag to pan, and zoom in and out;
pins stay on their spot at every zoom level and threads near the right edge
open inwards. Comments are shared in real time with
[Liveblocks](https://liveblocks.io).

Built for the Limitless Outsourcing full stack case study (Part B). The
original brief is in [docs/BRIEF.md](docs/BRIEF.md).

## Run it locally (about 3 minutes)

You need Node.js 22.12 or newer (`.nvmrc` pins 24) and a free Liveblocks
account.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your Liveblocks secret key. Create a project at
   [liveblocks.io](https://liveblocks.io/dashboard/apikeys), copy its
   **secret** key (starts with `sk_`), then:

   ```bash
   cp .env.example .env.local
   ```

   and paste the key after `LIVEBLOCKS_SECRET_KEY=` in `.env.local`.
   `.env.local` is git-ignored; never commit the key.

3. Start the app and open http://localhost:3000:

   ```bash
   npm run dev
   ```

If the key is missing the app shows these steps instead of failing.

To see real-time collaboration, open the app in a normal window and in a
private window: each browser gets its own demo user (kept in a cookie).

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm test`          | Run the unit tests (Vitest)     |
| `npm run typecheck` | Type-check the project          |
| `npm run build`     | Production build (works without a key) |

## Features

Core

- Click the image to add a comment anchored to that exact spot.
- Threads open to the right, or to the left (inwards) when they would cross
  the visible right edge of the image.
- Comments stay on their anchor point at every zoom level and while panning.
- Drag to pan; zoom with the − / + / Fit controls.

Optional and extra

- Edit, delete, reply, react to and resolve comments (built into the
  Liveblocks thread UI; editing works because each browser keeps a stable
  user).
- Responsive: comment panels shrink to fit small screens, and touch drag
  pans.
- Ctrl/⌘ + scroll or trackpad pinch to zoom around the cursor, scroll to
  pan, and `+` / `-` / `0` keyboard shortcuts.
- Error states for connection problems, failed comment actions, an image that
  fails to load and a missing key (see [Error handling](#error-handling)).

## How it works

### Keeping comments anchored

There are three coordinate spaces ([src/lib/geometry.ts](src/lib/geometry.ts)):

- **Container space**: CSS pixels inside the canvas element.
- **Image space**: pixels of the image at its natural size.
- **Anchor space**: image space divided by the image size, so the image goes
  from (0, 0) to (1, 1).

A thread stores its position in anchor space (`metadata: { x, y }`, see
[liveblocks.config.ts](liveblocks.config.ts)). That number means "42% across
the image" no matter how far the user has zoomed or panned, how big their
screen is, or how big the image file is.

The view is a pan offset and a scale, and the image is drawn with one CSS
transform: `translate(x, y) scale(s)`. Converting between spaces is then:

```
container = offset + anchor * imageSize * scale
anchor    = (container - offset) / (imageSize * scale)
```

A click is converted to an anchor with the second formula and saved. Pins are
drawn in an unscaled layer above the image at the position the first formula
gives. Because the pins are not inside the scaled element they keep the same
size at every zoom and their hit area stays usable. Zooming keeps the point
under the cursor (or the screen centre for the buttons) fixed:
`offset' = focal - (focal - offset) * scale' / scale`.

All of this is pure functions with unit tests, including one that places a
pin, zooms and pans, and checks the pin lands on the same image pixel.

### Left/right flip

[src/lib/thread-side.ts](src/lib/thread-side.ts) decides the side for each
pin, in container pixels:

1. The "visible image" is the image clipped to the canvas, so when you are
   zoomed in past the screen edge, the screen edge counts as the image edge.
2. Open right if the pin (32px) + gap (6px) + panel (350px) fit before the
   visible right edge.
3. Otherwise open left if the panel fits before the pin.
4. If it fits on neither side (small or zoomed-out image), open towards the
   side with more room.

It runs on every render, so a thread flips as you pan or zoom. Liveblocks
(through Radix) still keeps panels inside the browser window. Note: the
design mock-ups open threads outwards even near the edge; I followed the
written brief ("open inwards").

### Click versus drag

One set of pointer events handles mouse, pen and touch
([src/hooks/canvas.ts](src/hooks/canvas.ts)). A press becomes a pan only
after moving 4px; releasing before that is a click. Pointer capture keeps a
drag going outside the window. Clicks on pins, and events bubbling up from
the comment panels (React bubbles through portals), are ignored by the
canvas. A click while a thread or composer is open only closes it, like in
Figma, instead of also starting a new comment.

### State

| State                         | Where                                       | Shared? |
| ----------------------------- | ------------------------------------------- | ------- |
| Threads and their positions   | Liveblocks (`useThreads`, `useCreateThread`) | Yes     |
| Pan, zoom, container and image size | `useReducer` with [canvasReducer](src/lib/canvas-state.ts) | No, each user has their own view |
| Which thread or draft is open | `useState` in `ImageCanvas`                 | No      |
| Image loading status          | `useState` in `ImageCanvas`                 | No      |
| Connection status             | Liveblocks (`useStatus`)                    | No      |

The view state is a pure reducer so pan, zoom, fit and resize are unit
tested without a browser. The image re-fits on window resize until the user
pans or zooms, so their view is never reset under them.

### Project structure

```
src/
  app/
    page.tsx              server: missing-key check, picks the image
    api/liveblocks-auth/  access-token auth with a stable demo user
    api/users/            user info and @mention search for Liveblocks
  components/
    CommentingApp.tsx     providers, error boundary, header
    ImageCanvas.tsx       image, pan/zoom, click-to-comment, errors
    CommentLayer.tsx      pins, threads and the new-comment composer
    ConnectionBanner.tsx  connection problems, with retry
    Toasts.tsx            small toast notifications
    ZoomControls.tsx
    SetupRequired.tsx     shown when the key is missing
  hooks/canvas.ts         resize, pan gesture, wheel and keyboard zoom
  lib/                    pure logic, all unit tested
    geometry.ts  thread-side.ts  canvas-state.ts  comment-errors.ts  rooms.ts
```

## Error handling

| What goes wrong | What the user sees | How to try it |
| --- | --- | --- |
| No key in `.env.local` | Setup steps instead of the app | Remove the key and reload |
| Wrong key | Banner: "Couldn't connect to the comment server" with the reason and Retry | Put `sk_wrong` in `.env.local` |
| Connection lost | Banner: "Reconnecting… new comments are paused" | DevTools → Network → Offline |
| Slow first connection | After 8s, a banner with Retry instead of silence | Throttle the network |
| Click while offline | Toast explaining why no composer opened | Go offline, click the image |
| Empty comment | Can't be sent (Liveblocks disables send for blank text) | Try to post spaces |
| Posting fails | Toast, and the composer reopens at the same spot with the text | |
| Edit/delete/resolve fails | Toast; Liveblocks rolls the change back | |
| Image fails to load | Message with Try again; comments are disabled until it loads | Open `/?image=broken` |
| Unexpected render error | Error boundary with Try again | |

The auth route returns 403 with a plain-text reason for key problems on
purpose: the Liveblocks client stops retrying on 403 and passes the text to
the error listener, which the banner shows.

## Tests

```bash
npm test
```

Unit tests cover the coordinate maths, the flip rule (including the exact
boundary and the zoomed-in case), the pan/zoom reducer, the connection
banner states and the error messages. The interaction code was tested by
hand in the browser.

## Decisions and trade-offs

- **DOM, not `<canvas>`.** The brief says canvas, but the image plus
  absolutely positioned pins is simpler, accessible (pins are buttons) and
  works with the Liveblocks React components.
- **No pan/zoom library.** The maths is a few lines and I wanted to be able
  to explain and test every part of it.
- **Removed from the starter:** dragging threads around (@dnd-kit), the
  "place comment" button and the shared `zIndex` metadata. Thread positions
  were stored as screen pixels, which breaks as soon as you zoom.
- **One room per image** (`image-comments:<imageId>`), so comments always
  belong to one image. More images can be added in
  [src/lib/rooms.ts](src/lib/rooms.ts).
- **Resolved threads are hidden**, like in Figma.
- **Demo users.** There is no real login: each browser gets a random demo
  user kept in an httpOnly cookie.

Known limitations

- Two-finger pinch zoom on touch screens is not implemented (one-finger
  drag pans and the zoom buttons work). Trackpad pinch works.
- Clicking outside an unsent comment discards its text.
- The whole canvas re-renders on each pan frame. That is fine for dozens of
  pins; for hundreds I would move the transform to a ref or CSS variables.

## Credits

Started from the Liveblocks
[nextjs-comments-canvas example](https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-comments-canvas)
(Apache-2.0, Copyright 2021-present Liveblocks; license text in
[licenses/](licenses/LIVEBLOCKS-APACHE-2.0.txt)), and changed substantially.
The sample image is an original illustration made for this project.

## AI usage

I used Claude Code (Anthropic's Claude) throughout:

- **Understanding the task:** summarising the brief, reading the starter and
  the installed Liveblocks source to check how `FloatingThread`,
  `FloatingComposer` and the auth flow behave, and smoke-testing the starter.
- **Writing code:** the pure geometry/flip/reducer functions and their tests,
  the components, and this README, in small commits.
- **Reviewing:** a second pass that tried to break the code and checked its
  claims against the library source.

Things the AI got wrong that I caught and changed:

- **The flip rule.** Early suggestions compared only the panel width (350px)
  with the space left, forgetting the 32px pin and 6px gap, and one
  suggestion used "anchor x > 0.5", which breaks when zoomed in because the
  image's right edge is then off screen. I wrote the rule against the
  *visible* image edge and added boundary tests.
- **Popover scaling.** It claimed that scaling a wrapper would also scale
  the comment panels. They are portalled to `document.body`, so they would
  not; the real reason for the unscaled pin layer is constant pin size and a
  single tested mapping function.
- **Raw error text.** The first version of the auth route passed Liveblocks'
  JSON error straight to the UI; I changed it to one readable sentence.
- **Build-time setup screen.** The missing-key check would have been baked in
  at build time; I made the page render per request.
