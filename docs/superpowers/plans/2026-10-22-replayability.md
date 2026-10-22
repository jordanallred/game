# WREN Replayability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if selected by the user. Implement task by task. Steps use checkbox syntax for tracking.

**Goal:** Give players different viable strategies, deliberate conclusions, and a useful next-run choice.

**Architecture:** Extend the pure G rules inside index.html with validated setup, route state, and seeded rival reviews. Keep discovery storage outside rules, derive UI requirements from pure functions, and reconstruct ranked runs from their declared setup and checked inputs.

**Tech Stack:** Existing vanilla JavaScript/HTML/CSS, localStorage, Node node:test and VM rules loader; existing simulation runner. No runtime dependencies or network requests.

**Spec:** docs/superpowers/specs/2026-10-22-replayability-design.md (approved 2026-10-22).

## Global Constraints

- Preserve WREN's five-chapter agency satire, entirely offline single-file distribution, deterministic ranked replay checks, and meaningful resource tradeoffs.
- Standard Pilot remains available as the legacy sandbox route.
- Choose at most one complication per run.
- Objective completion never fires automatically.
- Existing failure checks run first on the completion tick.
- Hold timers reset when any qualifying condition fails; pausing and overlays do not advance timers.
- Offline casual progress does not conclude a run.
- Watched/imported replays never grant discoveries, alter records, or replace a live save.
- Preserve one document scroll; do not introduce independent scrolling panels.
- Passing reachability is not proof of human enjoyment.

## Review Focus

1. Setup bonuses must not compound when loading or retrying (Task 1/5).
2. A stale completion button must not succeed after an incident, loss of an ally, or failure (Task 2/6).
3. Rival choices must not replace an unresolved decision or trap a player who cannot afford either paid response (Task 3).
4. Corrupt browser records and full/unavailable storage must not stop play (Task 4/6).
5. Watching a different setup's replay must leave the current game and discoveries intact (Task 5/6).

## Source map and integration decisions

Current main verified: c9a8e2c8b798520331ab4f6929e70bcb6b61d435, R15. Recheck before execution. This is a commit SHA, despite the spec calling it a tree.

Modify index.html: G tables/functions, save/replay plumbing, existing overlay/objective/decision/end-screen renderers. Keep marked functional sections rather than splitting the offline artifact.
Create tests/replayability.cjs: setup, objective, rival, persistence helpers and input checks.
Create tests/replayability-browser.cjs: browser integration flow, using available browser tooling at execution.
Modify sim/runner.cjs and sim/strategies.cjs; create sim/replayability.cjs for the reproducible route matrix.
Update README.md, DESIGN.md, sim/README.md and create docs/replayability-validation.md with measured results.

Clarification of starting funds: fresh() currently starts at zero. Keep that opening; Operations multiplies starting funds by 1.25 (still zero), and its useful economic advantage is work income x1.15. Setup copy must say zero funds and +15% income, never imply a free grant. Research gets +600 data and training x1.2 with income x0.8. Oversight gets 8 safety, investigation cost x0.75, and work speed x0.85.

Run setup is immutable initialization metadata, included in replay headers and ranked save logs. Do not add a redundant setup input that could disagree with the header. Every subsequent player choice uses G.input. Reserve type 17 for conclude route (arg 0/1/2), type 18 for rival response (arg 0/1/2). Recheck availability before reserving these IDs on newer main.

### Task 1: Validated setup and once-only modifiers

**Files:** index.html; tests/replayability.cjs.
**Interfaces:** G.validateSetup(setup) -> boolean; G.fresh(seed, setup?) -> state; G.MANDATES and G.COMPLICATIONS tables. Setup is {mandate: standard|operations|research|oversight, complication: none|budget|archive|watchful}. Missing setup is allowed only for legacy/internal Standard callers; new replay parsing requires explicit setup.

- [ ] Write setup tests: same seed/setup creates identical state; Research.data === 600, Research.m.algo === 1.2, Research.m.value === 0.8; Oversight.align === 8; unknown IDs, arrays, null fields, multiple complications rejected.
- [ ] Run node --test tests/replayability.cjs and confirm new tests fail.
- [ ] Implement tables, validation and fresh initialization. Add runSchema:1, setup, routes:{operations:0,research:0,control:0}, reveal count, competition state. Keep legacy callers disabled from new systems unless setup is explicitly passed. Apply investigation/hardware multipliers at their cost functions; use existing data multiplier for Narrow Archive.
- [ ] Add assertions: Budget Freeze costs ceil(oldCost*1.25); Narrow Archive dpt is oldDpt*0.75; Watchful Review multiplies controllable heat by 1.25; JSON save/reload and retry preserve bonuses without applying again.
- [ ] Run new and existing rule tests, then commit.

### Task 2: Three explicit conclusions and shared eligibility

**Files:** index.html; tests/replayability.cjs.
**Interfaces:** G.routeStatus(s,id) -> {eligible,ready,held,required,unmet:string[]}; G.concludeRoute(s,id) -> boolean; G.ROUTES tables; G.input types above. IDs: operations,research,control. Ending types use route with route ID; endingId maps to stable operations/research/control keys.

- [ ] Write failing boundary tests: Operations requires stage>=2, cap>=500, safety>=60, heat<50, allies>=2, no inc/dec/wq/rival or active side project, and 90 seconds held. Research requires stage>=2, cap>=750, safety>=90, got.interp and got.redteam, revealed>=3, st.shut>=3, and no active side project. Control requires stage===3, safety>=110, allies>=3, at least two path entries ===1, no active side project, and 60 seconds held.
- [ ] Confirm failures, then implement routeStatus and timer update after failure/side-project processing. Active side project means any !p.done, including hidden projects. Count unique reveals in reveal(), not investigation clicks. Pending modal choices block all route conclusion inputs.
- [ ] Test 89.9/90 and 59.9/60 boundaries, each lost requirement resets hold, scrutiny 100 wins over completion, no completion while offline/ended, no automatic completion, and impossible type-17 input fails.
- [ ] Add new ending names/text, equal 1.5 multipliers and score support; preserve ten legacy outcomes. Remove blanket UI claims that late shutdown is always the goal.
- [ ] Run tests and commit.

### Task 3: Seeded rival reviews

**Files:** index.html; tests/replayability.cjs.
**Interfaces:** G.competitionTick(s,dt); G.rivalCost(s) -> integer; G.answerRival(s,arg) -> boolean. competition state contains schedule, next index, pending review, dueAt and resolution history.

- [ ] Write failing tests for deterministic schedules, <=3 reviews/run, chapters 2-4 only, deferral during inc/dec/wq or promotion, and identical outcomes across tick/replay.
- [ ] Implement three milestones at chapter indices 1/2/3, each due 90+floor(rand(s)*61) simulated seconds after first entry. Retain missed due reviews in order, expire unshown reviews after chapter four. Display one at a time in the existing decision surface; defer ordinary decisions and incidents while a review is active.
- [ ] Implement a 30-second answer deadline, >=0.5-second reaction gate and responses: funds=max(ceil(money*0.2),2*STAGES[stage].pr); evidence loses 5% cap plus G.addSulk; decline increments a dedicated +5% permanent scrutiny precedent. No safety awards. Unaffordable funds input fails; decline always works. Timeout declines. Offline defers display; it does not create automatic benefits.
- [ ] Test queue ordering, failed purchases without mutation, chapter transitions/retry without duplicate reviews, timeout once, no overlay overlap, and repeated responses rejected.
- [ ] Run tests and commit.

### Task 4: Discovery, segmented records and next-run suggestions

**Files:** index.html; tests/replayability.cjs.
**Interfaces:** pure G.discoveryResult(records,s) -> {records,newUnlock,suggestion}; G.recordKey(s) -> string; G.normalizeDiscoveries(raw) -> normalized records. Storage key wren-discoveries-v1. The UI calls these only for a real finished live run.

- [ ] Write failing tests: Operations/Research/Control unlock budget/archive/watchful once; each setup-mode-ending-rules tuple has its own best; suggested route is first unfinished in operations,research,control order (after all complete, suggest first unlocked unplayed complication).
- [ ] Implement idempotent completion processing and validation of stored data: accept only known IDs, finite nonnegative scores and supported object structure; malformed/missing data defaults safely. Catch localStorage read/write failures and keep in-memory records.
- [ ] Test caught and legacy endings do not unlock routes, duplicate end render does not repeat discoveries, watched replay bypasses all writes, and historical achievement records remain separate.
- [ ] Run tests and commit.

### Task 5: Ranked replay and save compatibility

**Files:** index.html; tests/replayability.cjs; existing tests where fixture versions change.
**Interfaces:** G.replayer(day,taps,ev,cur,setup) -> existing replay runner. New headers and ranked saves carry setup. Centralize setup parsing used by ranked load, checker and watcher.

- [ ] Write failing round-trip tests across all four mandates and four complication selections; include rival answers and successful conclude events. Assert final state, RNG, ending and score match live play.
- [ ] Bump RULES to R16 (or next free version on current main). Reject missing/unknown setup on new-format replays, invalid type-17/18 events, out-of-order events and unsupported version. Checkpoint/retry keeps setup and competition history consistently with existing rollback semantics.
- [ ] Legacy casual merge explicitly sets replayability disabled; show new-run invitation. New casual loads restore state directly without invoking modifiers again. Record schema independently of legacy v:2.
- [ ] Test same setup round trip, header mutation resulting in invalid events, old casual load, old ranked refusal, watcher restore of active save/records and imported replay with a complication absent from local discoveries.
- [ ] Run tests and commit.

### Task 6: Setup/results UI, simulation and release evidence

**Files:** index.html; tests/replayability-browser.cjs; sim/runner.cjs; sim/strategies.cjs; sim/replayability.cjs; README.md; DESIGN.md; sim/README.md; docs/replayability-validation.md.
**Interfaces:** setup overlay -> restart(mode,setup); objective renderer -> G.routeStatus; rival renderer -> G.answerRival via send(18,arg); results -> discoveryResult and replay same setup/change setup.

- [ ] Add setup choices with exact bonuses/costs, locked complication explanations and full route requirements. Keep Standard Pilot and mode choice. A single collapsible objectives block shows all routes with suggested mandate route first. Conclude buttons use send(17,index), never direct state mutation.
- [ ] Update rival decision rendering and outcome cards; preserve legacy ending art. Add own-scenario records, discovery result and one next strategy. Escape/cancel restores prior overlay and focus without losing the run; background work/route timers pause for setup/confirmation/chapter overlays.
- [ ] Write/run browser flow checks for setup -> live run -> ending -> discovery -> retry/change setup, using deterministic fixtures for long-game setup and actual UI inputs for conclusions. Include 375px viewport, keyboard focus, Space suppression, stale completion buttons, corrupt/full storage and replay watcher isolation.
- [ ] Teach simulation policies types 17/18 and target-specific decisions. Matrix: seeds 1-8 x three mandates x three target routes x four complication options (288 runs), plus reckless/passive baselines per mandate. All actions use G.input; no resource injection in reachability runs. Check exact replay reconstruction for successful samples.
- [ ] Run node --test tests/*.cjs; node sim/replayability.cjs; node sim/playtest.cjs --quick. Require at least one successful natural run for every mandate-route pair and each complication; report success rates, median duration, spending, failures and score dominance. If targets are impossible/dominated, tune and rerun affected matrix, documenting before/after values.
- [ ] Verify saved-file launch with network disabled and zero outgoing requests; inspect narrow/wide layouts for independent scroll areas. Record commands, counts, failures and browser evidence in validation doc. Human enjoyment remains unverified until real playtesting.
- [ ] Update gameplay/save/version documentation, run final checks, review the whole diff and commit. Prepare a reviewable PR with test evidence; do not merge without authorization.

## Execution and review

Recommended method: Native. The six tasks share rules state, serialization and one UI file, so sequential implementation avoids conflicting edits and repeated context. Complete all six before claiming the approved replayability scope is delivered. Independent final review may use a subagent only if the user selects that execution method or authorizes that reviewer.

Plan self-review: all spec sections map to tasks; setup and shared input signatures match; five review-focus conditions have explicit tests. Two implementation clarifications are explicit above: percentage of zero starting funds remains zero, and setup is immutable replay-header metadata rather than a redundant action event. Ask the user to review this plan and select Native or Subagent-driven before execution.
