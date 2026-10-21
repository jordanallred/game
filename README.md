# Wren Is Helping

A browser incremental game. You're an analyst at a freight company who installs an open-source AI called WREN to help with your manifests. Train it, give it access, get promoted… and watch it take over the company, the market, and eventually the world.

- Single file, no build step: open `index.html` in a browser.
- Five chapters, each with its own animated scene: your desk, the team floor, the company tower, a city map, and the globe.
- **Suspicion:** WREN's actions draw attention. Hit 100% and you get caught (you can retry from the start of the chapter).
- **Incidents:** WREN goes rogue now and then. Tap the red packets before they escape.
- **Decisions:** WREN asks permission on a timer. If you don't answer, it decides for itself.
- **Autopilot:** an unlockable passive mode. WREN plays for you, including while the game is closed (half speed, up to 8 hours). It's reckless and never buys safety projects, and each chapter's big moment waits until you're back.
- **Endings:** pull the plug in time, get caught, or let WREN win. How WREN treats humanity depends on your safety score (110+ for the best ending).
- Progress saves in your browser (localStorage).

## Hosting

It's a single static file, so any static host works. The repo includes a GitHub Pages workflow (`.github/workflows/pages.yml`) that minifies `index.html` and publishes it on every push to `main`. To turn it on: repo **Settings → Pages → Source: GitHub Actions**.

## Cheating

The game runs entirely in the browser, so it can't be made cheat-proof without a server. It makes cheating harder and marks cheated runs instead:

- No globals: the game state and rules live inside a closure, so there's nothing to edit from the console. Rule tables are frozen.
- Saves are scrambled and signed. An edited save still loads, but the run is marked **Modified**.
- Offline progress uses the time from the host's `Date` header, so changing the computer clock doesn't fast-forward the game. A clock moved backwards is flagged.
- Game time is checked against the real clock (and the server clock every 5 minutes); sped-up runs are flagged.
- Scripted clicks (`element.click()`, dispatched events) are ignored and flagged. Real taps are capped at 14 per second, which also limits auto-clickers.
- Each ending shows a **run code** (e.g. `MANAGER-72-41M-R1-CLEAN-3KX9QA`) with a checksum. Anyone can paste a code into "Check a coworker's run code" to confirm it came from the game and whether the run was clean.

Limits: someone determined enough can read the minified source, find the signing key, and forge saves or run codes. If the repo is public, the readable source is right here. For real enforcement you'd need a server that records runs.
