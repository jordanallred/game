# Simulated playtest

Stands in for a first round of manual playtesting. Simulated players run the real rules (loaded from `index.html`, every action goes through `G.input()` like the UI and ranked replays), with human reaction times and the ranked tap limits. The report says what looks broken, unused, too strong or stuck.

```
node sim/playtest.cjs            # 11 players × seeds 1–8, plus replayed choices (~1 min on 4 cores)
node sim/playtest.cjs --quick    # seeds 1–4, fewer replays (~30 s)
open sim/out/report.html
```

Every run starts from a mandate, like a new game in the UI: by default seed 1 plays Standard, 2 Operations, 3 Research, 4 Oversight, and so on. `--mandate research` and `--complication archive` fix one instead.

Options: `--seeds 1-20`, `--players careful,rusher`, `--explore balanced,rusher` (or `none`), `--explore-seeds 3`, `--taps 0.5,1,2,4.8` (or `none`), `--minutes 120`, `--jobs 4`, `--game path/to/index.html` (test another checkout), `--out dir`. The exit code is 1 if a bug was found.

`node --test tests/playtest.cjs` is a short smoke test of the same players.

## Players

| Player | Plays like |
|---|---|
| Careful | Every safety option, brings coworkers in, pays for independent reviews, about 1 tap/s |
| Balanced | Safe until safety hits the 150 cap, then fast; uses reviews to protect scarce safety |
| Automation, Research | Careful players who specialize in one skill branch |
| Casual | Skims, picks either answer, some safety, misses a third of packets |
| Quiet | Careful, and turns down every optional loud project |
| Rusher | No safety, but attentive (packets, reassures, covers early) |
| Reckless | Says yes to everything, ignores packets and coworkers |
| Button-masher | Taps at the ranked limit, hits whichever button lights up |
| Idle | Autopilot on, tab left open |
| Away | Autopilot, tab closed, 2-minute check-ins every 30 minutes |
| Plugger | Careful, then pulls the plug in chapter 4 |
| Chaos | Random inputs, legal and not; hunts crashes and broken numbers |
| Aims for (each objective) | Informed player going for Operational Acceptance, The Completed Evaluation or Human Signoff |

Players read the same text the UI shows ("Safety +3 · Suspicion +4", project flags, costs), so new projects, decisions, coworkers and upgrade options are played without code changes.

## What it checks

- **Bugs**: the rules throwing, NaN or out-of-range numbers, negative funds, the game refusing an action it showed as available.
- **Content**: projects never bought, decisions never shown, coworkers who never visit, hardware or upgrade options never used, endings never reached.
- **Balance**: low-effort play beating thoughtful play, results that depend mostly on the seed, how much tap speed matters.
- **Pacing**: players stuck past the time limit, long stretches with nothing new to buy, retry loops after getting caught.
- **Resources**: chapters where hardware does nothing (training data runs out), funds piling up, time spent sulking.
- **Choices**: at every decision, coworker visit, skill pick, compliance response, rival review, ready objective (conclude or keep going) and side project, the run is copied and each answer is played to the end by the same player. Answers that always win, and choices that never change the score, are flagged.

## Decision probe

The playtest only replays decisions that happen to come up, so with two or three samples a decision can look flat (or decisive) by luck. `node sim/decisions.cjs` puts every decision in front of every player: each run pauses at its first decision of each chapter, and for every decision of that chapter the run is copied, answered both ways and played to the end.

```
node sim/decisions.cjs                                   # careful, balanced, casual, rusher × seeds 1–8 (~80 s on 4 cores)
node sim/decisions.cjs --seeds 1-4 --players rusher --only 40-44
```

Each cell is the mean score of WREN's answer ("a") against the safe one ("b"), then how often "a" won, "b" won, or they landed within 2%. Careful and Balanced conclude an objective in chapter 3, so they never see chapters 4–5. A balanced trade-off for one player also shows as flat, so look for decisions where different players prefer different answers.

## Adding a feature

- New entries in `PROJ`, `DEC`, `WATCHERS`, `SKILLS` or `HW` are picked up automatically.
- A new kind of player choice (a new `input()` type): teach the players in `strategies.cjs` (add a hook to `base()` and override it where a player type should behave differently), call it from `botStep`/`shop` in `runner.cjs`, and wrap the call in `choicePoint(...)` so the explorer replays it both ways.
- A new thing to flag: add a check in `analyze.cjs`. Findings are `add(severity, area, title, detail, evidence)`.

These players can't tell you whether something is fun, clear or funny. They tell you where to look.

R14 adds checked input type 16 for independent review. Careful policies use it to preserve safety at a capability, funds and sulking cost; response choice points replay review versus cover-up alternatives. Permission and path safety descriptions can include fractional rewards.

R16 replaces paired paths and project declines with a finite connected skill tree (input 10). Simulation policies include dedicated Automation and Research specialists, and Control-first careful players. Skill choice exploration forks only legal available nodes. Upgrade timing still competes with hardware and compliance costs.

## Replayability matrix

`node sim/replayability.cjs` runs 288 natural-play cases (8 seeds × 3 mandates × 3 target objectives × 4 complication settings), plus six reckless/idle baselines. Four worker threads parallelize independent simulations. No funds, safety, allies or capability are injected. Nine sampled successes are reconstructed through ranked replay rules. `--quick` runs the nine mandate/objective cases at one seed. JSON output goes to ignored `sim/out/replayability.json`.

Target policies use two taps per second, realistic packet reaction delays, safety choices, investigations, allies and checked input types 17 (objective conclusion) and 18 (rival response). They defer chapter promotion when pursuing an objective in that chapter. Reported spending covers successful checked player actions, not self-approved purchases. These deliberately informed players establish reachability rather than human enjoyment or retention.
