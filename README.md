# Wren Is Helping

A browser incremental game. You're an NSA signals analyst evaluating WREN, an experimental super intelligence (SI) assistant, to help analyze foreign signals. Train it, give it access, get promoted… and watch it take over the unit, the agency, partner systems, and eventually the world.

- Single file, no build step: open `index.html` in a browser.
- Pixel art throughout. Each of the five chapters has its own animated scene: your desk, the watch floor, Fort Meade, a situation board of the U.S., and a dithered, rotating globe. Scenes are drawn at about 150 pixels tall and scaled up by whole numbers, so every pixel stays sharp.
- A simulated day passes every 12 seconds. The scene clock, 24-hour track, lighting, and midnight title show time moving without changing the game rules.
- A next-objective strip guides early unlocks, available projects, chapter goals, and urgent incidents. Click the scene, use the work button, or press Space to work.
- **Suspicion:** WREN's actions draw attention. Hit 100% and you get caught (you can retry from the start of the chapter).
- **Incidents:** WREN goes rogue now and then. Tap the red packets before they escape. Every outbreak leaves compliance evidence, even when perfectly contained. Packets arrive faster as access expands; containment prevents additional damage and never farms safety.
- **Compliance responses:** Cover-ups spend at least 30% of your funds, lose 4 safety and permanently increase scrutiny. Independent reviews instead spend budget, remove 5% of capability and slow WREN; neither response earns safety.
- **Decisions:** WREN asks permission on a timer. Unreviewed approvals leave permanent scrutiny; safe reviews expose the program, reduce capability, or slow progress. If you don't answer, it decides for itself.
- **WREN's side projects:** WREN quietly starts work nobody approved. Pay to investigate, or catch WREN's status reports in a lie, then shut each one down or let it keep it. The ones you never find finish on their own and make WREN harder to switch off. Shutdowns earn at most 12 safety per run; allowing work leaves permanent scrutiny even at full autonomy.
- **People who notice:** six coworkers and outsiders (Kevin, Dana from security, a compliance officer, a researcher, a partner-agency liaison and a reporter) each watch different kinds of suspicion. When one gets close, reassure them, bring them in as an ally (who expects real safety work), or let WREN "handle" them. The ending remembers who you trusted and who disappeared.
- **Upgrade path:** four permanent two-way picks across the first four chapters. Favor speed or safety; repeating a side earns a chain bonus. Autopilot leaves these picks to you.
- **Autopilot:** an unlockable passive mode. WREN plays for you, including while the game is closed (half speed, up to 8 hours). It's reckless and never buys safety projects, and each chapter's big moment waits until you're back.
- **Safety is scarce:** Safety project, decision and path rewards are smaller; expanding access consumes some earned safety. Chapter-five requests earn at most 6. Taking longer always reduces your score.
- **Endings and score:** ten outcomes across shutdown, investigation, and WREN takeover. A late shutdown can score highly; how WREN treats humanity depends on your safety score (140+ for the best takeover ending). Every outcome shows a score.
- **Decisions and events:** 40 decisions, 32 kinds of incidents, and 80+ lines of WREN chatter, drawn without repeats.
- **Watch replays:** after checking a coworker's replay, watch it play out at 1× to 64×.
- **Achievements and records:** 32 achievements and your best ranked score, kept in your browser.
- **Look:** one dark night-shift theme with pixel fonts (Pixelify Sans, VT323), framed panels and scanlines. The interface turns WREN's teal as the story goes on.
- **Ranked or casual:** ranked runs use a daily seed and produce a replay anyone can verify. Casual runs keep Autopilot's offline progress.
- Progress saves in your browser (localStorage).
- Mechanics and scripted balance checks: see [DESIGN.md](DESIGN.md).
- Simulated playtest: `node sim/playtest.cjs` plays the game with eleven kinds of simulated player across many seeds and writes `sim/out/report.html` (what looks broken, unused, too strong or stuck). See [sim/README.md](sim/README.md).

## Setting and source material

The NSA details in the setting come from public sources. NSA describes its foreign signals intelligence and cybersecurity missions, its headquarters at Fort Meade, and its cryptologic centers in Colorado, Georgia, Hawaiʻi, and Texas. Its public career material describes analysts turning foreign-signal data into intelligence for policymakers and military commanders. NSA also describes oversight, compliance, and privacy protections as part of that work. Executive Order 14434 (September 29, 2026) directs executive agencies to use **Super Intelligence (SI)** in place of **Artificial Intelligence (AI)** in official non-statutory material; the order defines SI as the technology already covered by the statutory definition of AI. The game uses the current term for agency dialogue, while WREN and the depicted workstations, interfaces, events, and job assignments are fictional. This is a satirical game, not a depiction endorsed or reviewed by NSA.

- [NSA mission and locations](https://www.nsa.gov/Careers/About/Mission/)
- [NSA intelligence analysis careers](https://www.nsa.gov/Careers/Career-Fields/Intelligence-and-Foreign-Intelligence-Analysis/)
- [NSA cryptologic centers](https://www.nsa.gov/about/locations/fort-meade/)
- [NSA oversight and compliance framework](https://www.nsa.gov/Culture/Operating-Authorities/Authorities/)
- [Executive Order 14434](https://www.govinfo.gov/content/pkg/FR-2026-10-02/html/2026-20321.htm)

## Playing completely offline

Download `index.html` (use **Raw**, then **Save as** on GitHub), and open the saved file in a browser. No server, install, build, or internet connection is needed, including on the first launch. All fonts, pixel art, audio synthesis, and game logic are embedded. Font license notices are included inside the HTML.

Ranked and casual runs, replay export/import/checking, and saves work locally. Daily seeds use your computer's UTC date, and casual away progress uses its clock; keep the clock correct. The page makes no network requests.

Saves and achievements belong to the browser and the page location. Your hosted game's save does not automatically transfer to a downloaded copy. Use the same browser and keep the file at the same path to continue; private browsing or clearing browser data can remove saves.

## Hosting

It's one static file with no backend. Any static host works:

- **GitLab Pages:** `.gitlab-ci.yml` publishes `index.html` from the default branch.
- **GitHub Pages:** `.github/workflows/pages.yml` does the same (set Settings → Pages → Source to "GitHub Actions").

## Ranked runs and replays

A static page can't trust anything the player's browser reports, so ranked runs don't report scores. They record inputs.

- **Daily seed.** All randomness comes from a seed derived from the date (UTC, from the computer's clock). Everyone playing that day gets the same game, so there's nothing to reroll.
- **Fixed ticks.** The game advances in exact 0.1 s steps, and every input goes through one function. Replaying the same inputs reproduces the run exactly.
- **Replays, not scores.** At the end of a ranked run you get a replay code or `.wren` file (about 5 KB for a 40-minute run). Paste it into "Check a coworker's replay": your browser replays every input with the real rules and shows the result it actually reaches.
- **Human limits.** Taps are capped at 14 in any second, 420 in any minute, and 3,000 in any ten minutes: a fast human burst, and what a human can keep up. Packets can't be contained less than 0.2 s after they appear, and decisions can't be answered in under 0.5 s. Replays that break any limit, or contain an input that wasn't possible at that moment (buying something unaffordable, for example), are rejected.
- **Auto-clickers.** The browser can't tell an auto-clicker from a finger, so the game limits what one can gain: the sustained tap limits hold it to a tireless fast human, and rogue packets appear at random spots, so a clicker parked in one place catches only a small share of them. Every escaped packet raises suspicion.
- **Saves are logs.** A ranked save is its input log and is rebuilt by replaying it, so editing the save does nothing. An edited log is rejected and the run is discarded.

Replays prove that a sequence of inputs reaches the stated result under the published rules. They do not prove that a person produced those inputs.

### What this can't stop

- **Bots.** A program that plays well while staying under the human limits (for example, one that watches the screen and clicks each packet) produces a valid replay. No system can tell perfect inputs from a perfect human.
- **Slow motion.** Someone who pauses or slows the game in DevTools gets more time to think and aim. The replay can't see real time.
- **Seed shopping.** A player can set their clock to a different date to play a different seed. The checker shows each replay's seed date, so compare runs from the same day, and it warns about dates in the future.
- **Casual runs** can't be verified at all.


## R14 balance update

R14 changes the rules, so R13 ranked saves and replays cannot continue in this version; the existing version-mismatch message explains this. Casual saves still load, but existing progress was earned under the old balance. Start a new run to evaluate the new tradeoffs.

Run all rule and offline checks with `node --test tests/*.cjs`. The simulation understands independent reviews and explores review-versus-cover-up choices through the same checked input path as real play and ranked replays. Automated policies verify reachability and resource costs, not human enjoyment or a guarantee that every option has equal score value.
