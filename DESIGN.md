# Design notes

Routine progression and strategic choices have different jobs. Funds buy positive upgrades; scarce skill points determine a build. Live decisions and unauthorized work retain narrative consequences. The browser game remains one self-contained offline file.

## Progression (R20)

- **Upgrades:** core upgrades add a benefit without autonomy, safety loss or suspicion. Each chapter also has proposals (`pick` pairs, nine in all): buying one side rules out the other. The safe side is roughly the pre-R20 upgrade; the `fast` side is 1.25–1.5× stronger and prints its cost (autonomy, an immediate suspicion bump, or safety). Autopilot always takes the fast side. Chapter 4 upgrades are priced, not capability-gated, so funds compete with hardware there. Safety/oversight improvements compete for the same funds but do not punish the player for buying them.
- **Skill tree:** twelve nodes in three four-deep branches. Each node costs one point. Start with two points and earn one per new chapter, six total. Nodes require the previous node in that branch, the printed chapter and capability; capstones need chapter 3 and capability 500, so a run that concludes in chapter 3 can still finish a branch. Points may be saved. Only one of the three capstones can be learned. Each node has one mechanic of its own:

| Branch | Node | Mechanic |
|---|---|---|
| Automation | Parallel analysts | WREN catches 1 in 4 rogue packets on its own |
| Automation | Delegated procurement | WREN buys hardware with up to 30% of funds each second; input 19 pauses it |
| Automation | Independent operations (capstone) | Allowed side projects pay out double |
| Research | Interpretability probes | Lies in WREN's status reports are caught automatically (reveals the side project) |
| Research | Recursive research (capstone) | Learning ×1.7, but autonomy +6 and safety −4 |
| Control | Outside auditors | Independent reviews cost half and no longer cost capability |
| Control | Human authority (capstone) | +15 points of shutdown odds; takeover 15% slower |

- **Wording:** effect text uses Funds, WREN works N× faster, Training data, Learning, Compute, Suspicion, Safety, Autonomy and Takeover. Oversight upgrades scale only 80% of suspicion growth, so their printed percentages are the real ones (m 0.7 prints "24% slower").
- **Chapter advancement:** separate from upgrades; always requires player approval, including with Autopilot. Skills are never bought automatically.
- **Compatibility:** R16 invalidates ranked saves/replays from previous rules. Casual effects remain; prior path choices consume the corresponding shared points. Retired declined purchases retain their earned partial effects and are not sold a second time. Retrying restores checkpoint skills and chapter, so it cannot farm points.

## Interface

Five accessible tab views: Play (scene, work, objective, essential meters), Upgrades (purchases, optional training diagnostics, chapter advancement), Skill tree (all connected branches and their requirements), Oversight (people, investigations, responses, off switch), Log (messages, achievements, replay checks). One view is visible at a time. The document owns scrolling: no pinned scrolling main column, people pane or inbox.

Funds, capability and attention remain available above each view. Badges show affordable upgrades, spendable skill points, unresolved oversight work and unread rule messages. New timed decisions, incidents and coworker visits select Play once; players can still navigate away, with a persistent return prompt. Objective links select the destination view before scrolling/focusing. Tabs support arrow keys/Home/End. Space works only on Play. Chapter transitions return to Play.

## Core tension

Capability and speed improve score; safety determines WREN's ending. A limited skill budget forces specialization versus breadth. Permissions, cover-ups and hidden activity retain lasting scrutiny. Independent review preserves safety but costs budget, capability and time. Buying the core upgrades is intended progression; the proposals are where the shop asks for a decision.

## Score

`score = (progress + safety) × ending × time × retries`

| Part | How it's computed | Why |
|---|---|---|
| Progress | `100 × log10(1 + capability)`; takeover endings use capability at the start of chapter 5. Takeovers and concluded objectives add 100 for finishing | Rewards building WREN up. Using the chapter 5 value stops stalling from paying off |
| Safety | `2 × safety score`, counted up to 150 | Safety is worth points on its own, but over-investing past the best ending only costs time |
| Ending | see table below | Makes the ending choice matter |
| Time | `1.3 / (1 + minutes / 70)` | Rewards finishing sooner at every duration; there is no floor after which delays become free |
| Retries | `0.9` per chapter retry | Retrying is allowed but not free |

| Ending | How | × |
|---|---|---|
| One Loose Cable | Pull the plug in chapter 4 | 1.8 |
| Operational Acceptance, The Completed Evaluation, Human Signoff | Conclude a ready objective (R17) | 1.75 |
| The Gardener | WREN wins, safety ≥ 140 | 1.5 |
| The Agency Correction | Pull the plug in chapter 3 | 1.2 |
| The Manager | WREN wins, safety 60–139 | 1.0 |
| The Optimizer | WREN wins, safety < 60 | 0.6 |
| Back to the Reports | Pull the plug in chapter 2 | 0.5 |
| Caught (any chapter) | Suspicion hits 100% | 0.3 |

## Mechanisms

| Mechanism | Purpose | Pros | Cons |
|---|---|---|---|
| **Work (tap)** | Earn funds and training data in every chapter | Direct resource control; chapter-five requests earn 0.1 safety at most once every 6 s, up to 6 total | No approval-click suspicion reduction. Safety-earning requests delay takeover. Rapid tapping has diminishing returns and ranked limits |
| **Hardware** | Compute sets how fast WREN can train on its data | Faster capability, once data is piling up | Exponential prices; competes with projects and cover-ups for money. In chapters 1–2 data usually runs out first, so extra compute does nothing; the training data stat says which one is the limit |
| **Upgrades** | Permanent progression | Resource, capability, oversight or safety benefits | Funds and prerequisites; purchase timing follows the current bottleneck. Proposals: the fast side costs autonomy, suspicion or safety and rules out the safe side |
| **Skill tree** | Build identity through specialization | Each node adds its own mechanic (auto-containment, auto-buying, caught lies, cheaper reviews, shutdown odds) | Six points for twelve connected nodes, prerequisites, one capstone, explicit delegation costs |
| **Suspicion** | The failure meter | Forces choices between speed, scrutiny and safety | Rises from autonomy, events, access, unreviewed permissions and cover-ups. Safety reduces passive growth by at most 25%. Hitting 100% means caught |
| **People who notice** | Six named people watch different kinds of exposure | Bringing someone in earns 2 safety, reduces scrutiny 5%, helps shutdown odds and earns 1 safety at chapter five | +8 attention on admission; within seven minutes gain 3 more safety or actually shut down a side project. Failure adds 25 attention. Reassurance costs money and makes return visits faster; WREN handling them adds autonomy, attention and pressure on others |
| **WREN's side projects** | Hidden unauthorized work undermines control | Investigation or catching a lie reveals it. Shutdown earns 2 safety, capped at 12 across the run; genuine shutdown still satisfies allies after rewards are exhausted | Shutdown loses 1% capability per size and causes sulking. Allowing earns a size-based boost, but adds autonomy and a permanent +5% base-scrutiny precedent even at 100% autonomy. Unfound work damages safety and shutdown odds |
| **Cover your tracks** | Emergency relief: −30 attention, 4 less per use in a chapter, minimum 14 | Immediate relief without retraining | At least 30% of current funds or the exponentially increasing chapter price; 60 s cooldown; −4 safety, +4 autonomy and a permanent +6% base-scrutiny precedent per use |
| **Independent review** | Honest compliance response: −30 attention | Preserves safety and adds no cover-up precedent | Greater of 20% funds or twice the chapter exception price, −5% capability, and 30 s sulking (stacks to 90 s). 90 s cooldown. Earns no safety; repeated use therefore slows completion and reduces score |
| **Autonomy** | The hidden cost of growth. Comes from growth projects, "yes" answers, escaped packets and failed plug attempts | Nothing directly; it's what you pay | Faster suspicion; lower plug odds |
| **Incidents** | Expose unauthorized activity and test attention | Containment prevents extra escape damage | Every outbreak adds 4 + chapter-index attention. Perfect containment removes no attention and earns no safety. Packet travel and spacing tighten with chapter and autonomy; protocol/review-cell safeguards matter. Escape attention is 2 + 1.5 × chapter-index, reduced 40% by a containment protocol; each escape also adds 0.5 autonomy |
| **Decisions** | Nine unique questions per chapter (eight serious, one silly) | Smaller finite safety gains or faster progress | Every pre-world unreviewed approval adds a permanent +5% base-scrutiny precedent on top of its printed effects. Safe choices that cause sulking also expose 2 + chapter-index attention. Other safe choices sacrifice capability, attention or takeover speed. Descriptions include these costs. Timeout picks WREN's option |
| **Off switch** | The alternative to letting WREN win | Late success is the top-scoring ending | Odds are capped at 95%, then halved after each failure. Each failure: +6 autonomy, +10 suspicion |
| **Autopilot** | Passive play, including offline in casual mode | Progress without attention | Buys upgrades (the fast side of every proposal) but never skills or chapter advancement; always says yes, contains about a third of packets, answers questions after 8 s, allows any side project you found but never investigates |
| **Chapter checkpoints** | Getting caught isn't a full restart | Keeps hard runs alive. Each retry of the same chapter is easier: autonomy −10 per retry, suspicion builds 30% slower per retry, and hidden side projects are swept up | −10% score per retry |
| **Daily seed** (ranked) | Everyone plays the same randomness each day | Fair comparisons | None |

## Ending balance (R18)

The simulated playtest (`node sim/playtest.cjs`, which since R18 starts every run from a mandate, answers rival reviews and decides whether to conclude a ready objective) showed objectives were a trap: concluding scored 30–50% less than playing on to The Gardener, because objective endings missed the +100 for finishing and end with far less capability. They now get the +100 and a 1.75 multiplier. One Loose Cable drops from 2.0 to 1.8; it had out-scored every other ending. For informed players the five good endings now land close together (seeds 1–8, median score): Operational Acceptance ~1040, The Gardener ~970, Human Signoff ~960, One Loose Cable ~950, The Completed Evaluation ~880 (and ~1120 for a Research specialist who gets there sooner). Concluding early is a real choice: a generalist who reaches The Completed Evaluation by accident still scores about 19% more by playing on.

Sulking is 30 s per safe answer at 40% speed, capped at 90 s, down from 60 s at 60% capped at 180 s; it had covered 47% of a careful run and now covers about 22%. Retrying a chapter is more forgiving (suspicion 30% slower and autonomy −10 per retry): casual players were caught in chapter 4 and again on every retry in 8 of 24 seeds; now 3 of 24.

## Silly decisions and decision tuning (R19)

Five sillier decisions, one per chapter, from the humor pitch: the office potluck, the softball team, a TED talk, renaming Tuesday and WREN's birthday. Each one pulls a lever the serious questions don't: the potluck survey is training data and goodwill, softball keeps WREN too busy for incidents for three minutes, the TED talk Q&A reveals a hidden side project (which helps a Completed Evaluation run even though it is the risky answer), Second Monday distracts everyone, and the birthday trades a big capability jump for safety.

`node sim/decisions.cjs` (new) puts every decision in front of every player instead of sampling. Before this change it showed the three biggest chapter 5 questions always went to the safe answer, and the other five nearly always did: takeover speed does not raise the score (a faster takeover just stops capability growth sooner), so "Takeover ×1.5 · Safety −8" was all cost. WREN's chapter 5 answers now also grow capability (×1.5 to ×3), so a player far from an ending threshold may take them while one near The Manager or The Gardener should not. Six decisions the playtest flagged as never changing the score were retuned: data rewards that no longer mattered by chapter 2 became training, funds in chapter 4 (which pile up) became training or compute, and their safe answers give more safety (+3 to +6).

After the change (seeds 1–8): no decision has one answer that wins for every player and seed (was 3), and the playtest's score-flat choices drop from 14 of 52 to 12 of 53. The remaining flat decisions are mostly ones where the two answers cancel out for the sampled player, which is a balanced trade-off rather than a meaningless one. Medians: Careful 852 (was 825), Balanced 854 (823), Rusher 393 (361), Casual 537 (365, now reaching The Manager in half its runs), objective players unchanged within noise. Thoughtful players still barely feel chapter 3 decisions, because they conclude an objective soon after; that is a pacing question for later, not something to fix with bigger numbers.

## Skill tree and shop overhaul (R20)

The R19 playtest found that careful players conclude in chapter 3 and never reached a capstone (chapter 4), leaving a point unspent; the Research specialist out-scored a careful generalist by 30%; swapping one skill moved the score under 4%; every player bought all 37 projects; and chapter 4 funds piled up for 67% of the chapter. R20 moves the capstones to chapter 3, gives every node a mechanic of its own, adds nine proposal pairs, folds Budget forecasting into Leadership briefing tools, renames mismatched upgrades (Procurement planning → Grant renewal, Emergency response planning → Crisis briefings), prices chapter 4 upgrades instead of gating them on capability, and raises the chapter 4 gate's cost (1.5T) while lowering its capability requirement (20,000).

Fast sides were first tuned too generously: Reckless and Button-masher players rushed through before suspicion caught up (Reckless survived 2 of 4 seeds). Their suspicion bumps and autonomy were raised until both were caught about as often as in R19. The Plugger policy now waits for capability 15,000 before trying the plug, because Human authority makes 50% odds arrive at the start of chapter 4.

After the change (seeds 1–8, median score, R19 → R20): Careful 852 → 898, Balanced 854 → 883, Automation 1003 → 918, Research 1111 → 1021, Casual 537 → 566, Rusher 393 → 411, Plugger 965 → 954, objective players within 3%. The Research lead over a careful generalist falls from 30% to 14%, and its gap to Automation stays about 11%; Research still pairs naturally with The Completed Evaluation because Interpretability probes reveal side projects. Reckless 8/8 and Button-masher 5/8 caught (were 8/8 and 7/8). The chapter 4 funds pile-up drops from 67% to 58% of the chapter, and the 8-minute chapter 5 stall is gone. `node sim/decisions.cjs` still finds no decision with one answer that always wins. New findings: for the Balanced player (a Control player) the Control skills beat the other roots by 4–7%, and Rusher prefers the safe chapter 5 proposal by 4% because speed past the takeover threshold earns nothing.

## Balance check

Run `node --test tests/*.cjs` and `node sim/playtest.cjs`. The latter compares sixteen policies (including one aiming for each objective) across eight seeds, rotating through the four mandates, explores permission/skill/side-work/compliance-response alternatives and varies tap speed. Policies use checked inputs, finite reaction times, missed packets and the printed consequences. Careful and Balanced now pay for independent reviews; Rusher, Reckless, Masher and idle policies retain cover-up/neglect behavior. Decimal safety rewards are parsed without truncation.

The tests deliberately do not assert that every safe answer or late shutdown always wins: shutdown is probabilistic, and a particular seed or policy may prefer different choices. They check both benefit and cost for all 90 permission options, evidence retained after perfect containment, lasting cover-up/access costs, bounded safety farming, mitigation effectiveness, honest-review resource costs/cooldown, and deterministic replay of the new review input. Other coverage includes reachability, slower safe runs, branch exclusivity, old casual fields, ranked human input limits, offline operation, ally promises, and hidden side work.

See `sim/README.md` for reproduction. Simulation warnings are investigation prompts: score-flat options can still change narrative or endings, and a dominant score in three sampled forks does not prove universal dominance. In particular, slow policies still have long waiting periods; this rebalance does not claim to solve overall pacing or replace fresh human playtesting. R16 ranked replay/save version mismatch is intentional; casual saves retain their previous state and cannot be treated as fresh R16 balance tests.

## Content

Drawn from shuffled pools, so nothing repeats until its whole pool has been used:

| Pool | Size |
|---|---|
| Ambient WREN messages | 80 (16 per chapter) |
| Incidents | 32 (8 per chapter) |
| Decisions | 40 (8 per chapter) |
| Side projects | 16, each with a reveal line; 3 shut-down and 3 allow replies; status reports about compute, safety and hardware |
| People who notice | 6 people, 7 lines each (first visit, return visit, reassured, brought in, promise kept, handled, went public) |
| Chapter 5 replies | 42 |
| Plug failure lines | 10 (escalating) |
| Self-approval, incident outcome, timeout, purchase lines | 3–6 variants each |

### Flavor (cosmetic, outside the rules)

Jokes that never touch the game state or the rules' random numbers, so they don't change ranked runs or replays. They live in the UI code (search for `FLAVOR`) and use their own shuffle bags.

| Pool | Size |
|---|---|
| Running gags (Kevin, the printer, Dana, Marguerite, the Tulsa fridge, Joan), shown in order per chapter | 29 |
| Office happenings, with a banner over the scene | 42 (8–10 per chapter) |
| Rare surprises (about 1 in 12 happenings, each once per run) | 9 |
| News ticker headlines, plus a few that react to suspicion, sulking, autopilot, autonomy, cover-ups and GPUs | 35 + 6 |
| Breaking ticker headlines, queued when the player buys hardware (at count milestones) or upgrades, covers up, handles an incident, pulls the plug, turns on autopilot, makes WREN sulk, crosses 50%/80% suspicion, or reaches a new chapter. They show at most once every 20 s and read the run state only | 46 |
| Clickable desk items in chapter 1 (mug, clock, poster, door) | 12 |
| Poking WREN's eye (lines at 3 to 100 pokes) | 8 |
| Secret words typed anywhere, plus the Konami code | 14 + 1 |
| WREN noticing you: fast tapping, idle for 2 minutes, coming back to the tab | 4 each |
| Real clock and holiday lines (once per run) | 7 + 10 |
| Patch notes when projects finish (35% chance) | 10 |
| Extra line on the caught screen | 4 |

A golden duck can fly across the scene once per run after four minutes (10% chance each minute); catching it skips that tap and unlocks an achievement. Six silly achievements: Poke, Desk inspector, Hidden channel, Duck season, Have you tried turning it off and on again?, Night shift.

## Replayable mandates and objectives (R17)

Mandates alter initial conditions once, then checkpoints and replays preserve them. Operations' useful economic benefit is income +15%; its percentage-of-starting-funds bonus remains zero because the opening budget is zero. No grant is silently added. Complications use existing data/scrutiny multipliers or hardware prices.

Three new route endings share one score multiplier (1.75 since R18, see below), with personal bests separated by route and setup. Requirements live in `routeStatus`, and the UI, hold timers and checked completion input all use that function. Unresolved requests and hidden unauthorized work block completion. Research evidence uses checkpointed reveal/shutdown counts rather than aggregate retry statistics, preventing repeated failures from farming a conclusion. Classic endings and multipliers remain intact.

Rival reviews are seeded chapter milestones with at most three appearances. Responses trade budget against capability/time or permanent scrutiny; none awards safety. Gates wait until a pending review is answered. A retry preserves rival history and treats a still-pending review as declined, so it cannot erase its consequence.

Discovery storage is separate from active state and has no influence on replay verification. A checker can reproduce a declared challenge even when the local player has not discovered it. Watching a replay never writes discoveries or scenario records. UI setup/results use the existing overlay; objective details collapse in normal play, and the newest eight messages show in a Live log beside the scene (full history in the Log tab). The document is the sole game scroll surface. Control objectives count learned Control skills (the R16 skill tree replaced paired path choices).
