# WREN: reasons to start another run

Date: 2026-10-22
Status: Proposed implementation specification; product implementation has not started.
Base: jordanallred/game main, tree c9a8e2c8b798520331ab4f6929e70bcb6b61d435 (R15).

## Intent and constraints

The player should finish with a concrete strategy to try next. The user approved distinct starts, exclusive specializations, competing organizations, multiple victory paths, persistent discovery, and a restrained interface. Preserve WREN's five-chapter agency satire, entirely offline single-file distribution, deterministic ranked replay checks, and meaningful resource tradeoffs. The previous pitch's university/startup examples do not fit this setting; use agency pilot mandates instead.

## Alternatives and recommendation

1. More achievements and ending collection: cheap, but repeats the same optimization.
2. Permanent stat bonuses/prestige: extends progression, but eventually erases pressure.
3. Different mandates, objectives, and external competition: recommended. Progress expands the available strategies without multiplying starting power.

## Run setup

A compact setup overlay chooses mode, mandate, and one optional unlocked complication. Show starting resources, benefits, liabilities, and complete victory requirements before confirmation. No additional permanent sidebar. Standard Pilot remains available as the legacy sandbox route.

Three new mandates are available immediately:
- Operations: starting funds +25%, work income +15%, controllable scrutiny growth +20%. Demonstrate a sustainable chapter-three deployment.
- Research: starting data +600, training efficiency +20%, work income -20%. Complete a controlled capability evaluation and close the pilot.
- Oversight: start with 8 safety, investigation costs -25%, automated work speed -15%. Reach a chapter-four independent shutdown.

Modifiers affect existing values once at initialization and remain in checkpoints. No mandate is an objectively stronger starting kit.

## Three victory paths

These are new deliberate conclusions, not labels placed on the same takeover:
- Operational acceptance: chapter 3 or later, capability at least 500, safety at least 60, scrutiny below 50, two current allies, no unresolved incident/decision/person request or active side project. Maintain these conditions for 90 simulated seconds; then the player may conclude deployment.
- Research complete: chapter 3 or later, capability at least 750, safety at least 90, acquire interpretability and red-team projects, reveal at least three unauthorized projects through investigation or caught lies, shut at least three down, no remaining active side project. The player may conclude with a documented pilot closure.
- Human control: chapter 4, safety at least 110, three current allies, no active side project, and at least two oversight-side skill-tree selections. Maintain conditions for 60 simulated seconds; then perform a guaranteed independent shutdown that ends the run.

All three routes remain possible from all mandates; starting mandate influences the approach rather than dictates the ending. Existing plug, caught, and takeover outcomes remain. Normal random plug attempts retain their existing risks. Objective completion never fires automatically. Existing failure checks run first on the completion tick. Hold timers reset when any qualifying condition fails; pausing and overlays do not advance timers. Offline casual progress does not conclude a run.

Targets above are initial tuning values, not claims of balance. Simulation must demonstrate each route from each mandate before release. If impossible or dominated, change targets before shipping and document measured results.

## Specialization and ordinary upgrades

Reuse PATHS: four permanent two-way selections, with visible opportunity cost. Do not add another skill tree. Remove route-wide score incentives that make the same late shutdown the only score-maximizing answer. Ordinary hardware and projects continue providing run-local growth.

## Competing programs

Introduce two fictional agency pilots, not multiplayer services. Vector pursues operational deployment; Lantern pursues evaluation. Their seeded milestone times produce at most three external reviews in a run, in chapters 2-4. At each review, select one response:
- Demonstrate throughput: spend 20% current funds, progress rival pressure relief.
- Share evidence: lose 5% current capability and receive 60 seconds of sulking.
- Decline: permanent +5% scrutiny-growth precedent.
Require a minimum chapter-scaled price for the funds response. Reviews never grant safety or increase base throughput. Missed responses choose decline. They use the existing decision surface with a distinct sender, queue without hiding current decisions, and never occur during incidents, promotion cards, pending people requests, or endings. Each review's scheduled time, pending state, deadline, and resolution are in deterministic rules state.

The purpose is pressure on stockpiling and route timing, not a separate rival-management screen. Rivals never instantly end the player's run.

## Discovery across runs

Persist completed routes, mandate-specific personal bests, and challenge discoveries separately from the active run. First completion unlocks each of three optional complications:
- Operations unlocks Budget Freeze: hardware costs +25%.
- Research unlocks Narrow Archive: incoming training data -25%.
- Human control unlocks Watchful Review: controllable scrutiny growth +25%.

Choose at most one complication per run. These are voluntary harder starts with separate records, not permanent power. All essential gameplay is available on the first run. End screen shows outcome, selected route/mandate, final score, discoveries, and one deterministic suggestion for an uncompleted route. Offer retry same setup or choose a new approach. Watched/imported replays never grant discoveries, alter records, or replace a live save.

## Scoring and records

New route endings use the same 1.5 ending multiplier initially; existing endings keep their values. Display objective completion separately from legacy score. Store personal bests by rules version + mode + mandate + complication + ending. Do not compare unlike setups as one leaderboard. Keep legacy achievements and historical bests visibly historical. No achievements require repeated identical-run grinding.

## Architecture and persistence

Keep product distribution as index.html. Add pure tables and functions inside G for mandate initialization, route status/hold tracking/completion, and competition. Use existing input dispatch for selecting setup and concluding an objective; all ranked-affecting choices enter the event log. UI derives eligibility and reason text from the same pure route-status function.

Bump rules version. Ranked replay headers include validated mandate and complication identifiers. Checker reconstructs initialization from those values and rejects missing/unknown settings for the new version, impossible completion events, altered deadlines, and out-of-order inputs. Version mismatch retains existing clear refusal behavior.

Old casual saves continue as Standard Pilot with new systems disabled; show an invitation to start a new run for the new rules. New saves carry an explicit run-schema version; never apply starting modifiers again on load/retry. Missing optional record fields get safe defaults; malformed discovery data cannot break startup. Discovered complications do not affect replay validity: verification reconstructs the declared setup without checking local unlocks.

## Interface

Setup and results overlays contain run variety and discovery. During play, add one collapsible mandate objective to the existing next-objective system with explicit unmet requirements and hold time. Show rival choices only when due. Preserve one document scroll; do not introduce independent scrolling panels. Keyboard focus returns to the invoking control when overlays close. Work shortcuts cannot trigger while a setup/select/completion dialog has focus.

## Verification and release criteria

- Existing offline and rules tests pass.
- Pure tests cover starting modifiers exactly once, each objective boundary, condition-loss timer reset, failure-before-completion, queued reviews, deadlines, and capped review count.
- Save/load and chapter retry preserve mandate, complication, timers, and competition without duplicating modifiers/rewards.
- Ranked export -> verify reproduces state for all mandates and complications; tampering is rejected.
- Replay watching cannot mutate discoveries, active saves, or scores.
- Seeded simulations cover every mandate/route combination and each complication, including reckless and passive policies; report success rates, durations, spending, failures, and dominant choices. Passing reachability is not proof of human enjoyment.
- Browser checks cover setup -> play -> completion -> discovery -> next run, keyboard, narrow viewports, and no nested scrollbars.
- Confirm zero network requests from the saved file.
- Human playtesting must assess whether the starts feel different and whether the end screen inspires another strategy. Do not claim retention is proven by automated tests.

## Delivery order

Implement deterministic run setup and route conclusions first; integrate competition and discoveries before calling this replayability scope complete. Preserve a reviewable branch/PR and document balance measurements. Re-read current main before implementation to incorporate any newer skill-tree/UI work.
