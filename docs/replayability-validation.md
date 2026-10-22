# R16 replayability validation

Implementation base: main c9a8e2c8b798520331ab4f6929e70bcb6b61d435. Distribution remains index.html, with no runtime dependencies.

## Evidence

- Original baseline: 55 tests passed before implementation.
- Setup, objective, rival, discovery and replay rules were exercised with failing tests before implementation, then passing tests.
- Desktop (1440×900) and mobile (375×900) browser checks open the actual saved file, select Research, play, reload, inspect objectives and detect nested scroll areas. No page errors or HTTP requests were observed.
- A saved casual fixture at a research conclusion verifies the actual completion button, outcome, discovery persistence, retry, setup cancellation/focus and cross-setup replay watching. Long-game fixtures are not counted as natural reachability evidence.
- Browser plugin unavailable; Playwright with a local Chromium executable was used. Browser tests explicitly skip if Playwright/Chromium is absent; set WREN_CHROME for a non-default executable.

The first full natural-play matrix reached all 288 requested objectives without injected resources; all nine sampled replays reconstructed their ending and score. Final checks and measured tables are appended after review.

## Limits

Automated target policies know the objectives and answer consistently. Their success does not prove a first-time human will find the game easy, understandable or worth replaying. Human retention and enjoyment remain unverified. No multiplayer service, recurring reward obligation or permanent stat inflation is introduced.

## Implementation clarifications

- Setup is immutable replay metadata. Subsequent conclusions and rival choices use checked event inputs; there is no redundant setup event that could conflict with the header.
- Starting budget remains zero; Operations' income advantage is explicit in setup copy.
- Original casual saves keep the legacy simulation. New ranked versions require explicit valid setup; earlier ranked logs retain the version-mismatch explanation.
- Research evidence rolls back with checkpoints. Aggregate lifetime attempt statistics cannot qualify the objective.

## Final automated results

- Full rules/offline/simulation/browser suite: 74 passed, 0 failed, 0 skipped (Chromium enabled).
- Natural-play matrix: 288/288 target objectives completed across 36 mandate/route/complication groups, eight seeds each; 0 crashes.
- Nine sampled natural runs replayed to the same ending and score, including checked rival and conclusion inputs.
- Six reckless/idle baselines ended in chapter-two investigations (27–31 points), rather than obtaining any new victory.
- Legacy quick playtest completed without its bug exit condition.

### No-complication median completion time (minutes)

| Mandate | Operations objective | Research objective | Human control |
|---|---:|---:|---:|
| operations | 55.8 | 62.3 | 70.7 |
| research | 51.3 | 62.2 | 72.8 |
| oversight | 60.1 | 69.7 | 75.3 |

The informed policy trains Research quickly; Oversight is slower but starts with assurance and cheaper investigation. Equal completion times are not claimed. Route records are separate so the higher-capability control objective does not displace earlier conclusions. All challenge variants were reachable; Narrow Archive produced the largest delays. Human preference and perceived difficulty still need playtesting.

### Reproduction

```sh
WREN_CHROME=/path/to/chromium node --test tests/*.cjs
node sim/replayability.cjs
node sim/playtest.cjs --quick
```

The browser tests run against a file URL at 1440×900, 375×900 and 1280×900. They detect page errors and outgoing HTTP requests and cover actual setup, work, load, research conclusion, unlock, retry, cancellation and replay-watch interactions.

## Independent review and regression pass

A fresh reviewer found four functional defects: a blocked chapter-retry queue, conclusion actions skipping same-tick failure checks, incomplete setup requirements, and a ranked achievement excluded by the historical-record guard. All four were corrected with observed failing-then-passing rules/browser tests. Conclusion inputs now request a finish that resolves after the tick's failures, ally promises, events and eligibility checks.

Final verification on the corrected rules: 74/74 tests passed with no skips; the full 294-case matrix again reached all 288 requested objectives, with nine exact replay samples and zero crashes/errors. Additional actual-browser checks exercised mobile setup, an unaffordable rival demonstration with a working decline, and continued play when localStorage writes throw.

No review findings remain deferred. Browser validation used Chromium only; Firefox/Safari and human enjoyment are unverified.
