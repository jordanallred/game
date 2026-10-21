# Wren Is Helping

A browser incremental game. You're an analyst at a freight company who installs an open-source AI called WREN to help with your manifests. Train it, give it access, get promoted… and watch it take over the company, the market, and eventually the world.

- Single file, no build step: open `index.html` in a browser.
- Five chapters, each with its own animated scene: your desk, the team floor, the company tower, a city map, and the globe.
- **Suspicion:** WREN's actions draw attention. Hit 100% and you get caught (you can retry from the start of the chapter).
- **Incidents:** WREN goes rogue now and then. Tap the red packets before they escape.
- **Decisions:** WREN asks permission on a timer. If you don't answer, it decides for itself.
- **Autopilot:** an unlockable passive mode. WREN plays for you, including while the game is closed (half speed, up to 8 hours). It's reckless and never buys safety projects, and each chapter's big moment waits until you're back.
- **Endings:** pull the plug in time, get caught, or let WREN win. How WREN treats humanity depends on your safety score (110+ for the best ending).
- **Ranked or casual:** ranked runs use a daily seed and produce a replay anyone can verify. Casual runs keep Autopilot's offline progress.
- Progress saves in your browser (localStorage).

## Hosting

It's one static file with no backend. Any static host works:

- **GitLab Pages:** `.gitlab-ci.yml` publishes `index.html` from the default branch.
- **GitHub Pages:** `.github/workflows/pages.yml` does the same (set Settings → Pages → Source to "GitHub Actions").

## Ranked runs and replays

A static page can't trust anything the player's browser reports, so ranked runs don't report scores. They record inputs.

- **Daily seed.** All randomness comes from a seed derived from the date (taken from the host's `Date` header when available). Everyone playing that day gets the same game, so there's nothing to reroll.
- **Fixed ticks.** The game advances in exact 0.1 s steps, and every input goes through one function. Replaying the same inputs reproduces the run exactly.
- **Replays, not scores.** At the end of a ranked run you get a replay code or `.wren` file (about 5 KB for a 40-minute run). Paste it into "Check a coworker's replay": your browser replays every input with the real rules and shows the result it actually reaches.
- **Human limits.** Replays are rejected if they tap more than 14 times in any second, contain a packet less than 0.2 s after it appears, or answer a decision less than 0.5 s after it's shown. Any input that wasn't possible at that moment (buying something unaffordable, for example) also gets the replay rejected.
- **Saves are logs.** A ranked save is its input log and is rebuilt by replaying it, so editing the save does nothing. An edited log is rejected and the run is discarded.

There's no signing key in the page, so reading the source doesn't help anyone forge a result.

### What this can't stop

- **Bots.** A program that plays well while staying under the human limits produces a valid replay. No system can tell perfect inputs from a perfect human.
- **Slow motion.** Someone who pauses or slows the game in DevTools gets more time to think and aim. The replay can't see real time.
- **Seed shopping.** A player can set their clock to a different date to play a different seed. The checker shows each replay's seed date, so compare runs from the same day, and it warns about dates in the future.
- **Casual runs** can't be verified at all.
