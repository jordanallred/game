# Design notes

Every mechanism in the game exists to create a choice. This file lists each one with what it's for, what it costs, and how it was balanced. Numbers live in `index.html` (search for `TUNE`, `STAGES`, `PROJ`, `DEC`).

## The core tension (R14)

You want WREN to get more capable (that's the job, and capability is most of your score). Everything that makes it more capable also makes it more autonomous and draws more attention. Safety work slows WREN down (every safety option has a visible speed, funds or suspicion cost) but decides how the story ends. Safety contributes points only up to 150. Finite safety rewards are halved from R13, access-expanding projects consume assurance, and repeatable sources have run-wide limits. Choosing every safety option may still reach the best ending, but costs time, capability and budget. You can stop WREN at any point, but stopping early is worth very little.

## Score

`score = (progress + safety) × ending × time × retries`

| Part | How it's computed | Why |
|---|---|---|
| Progress | `100 × log10(1 + capability)`; takeover endings use capability at the start of chapter 5, plus 100 for finishing | Rewards building WREN up. Using the chapter 5 value stops stalling from paying off |
| Safety | `2 × safety score`, counted up to 150 | Safety is worth points on its own, but over-investing past the best ending only costs time |
| Ending | see table below | Makes the ending choice matter |
| Time | `1.3 / (1 + minutes / 70)` | Rewards finishing sooner at every duration; there is no floor after which delays become free |
| Retries | `0.9` per chapter retry | Retrying is allowed but not free |

| Ending | How | × |
|---|---|---|
| One Loose Cable | Pull the plug in chapter 4 | 2.0 |
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
| **Growth projects** | Increase capability and income | Multipliers can shorten exposure time | Funds, autonomy, chapter loudness, and loss of 1–4 safety on each access-expanding project (20 × loudness, rounded, at least 1). Consequences are printed on the card |
| **Turn down** | Document a slower route instead of expanding access | +1 safety, no autonomy/loudness/assurance loss; keep the square root of each boost | Give up the full multiplier; WREN sulks. Setup, core speed projects and gates cannot be declined |
| **Upgrade path** | Four permanent two-way picks, one unlocked in each of the first four chapters | Speed or safety gains; repeating a side adds a chain bonus | You give up the other option. Speed raises autonomy or suspicion; safety cuts funds, WREN speed, training or takeover speed. WREN never chooses for you |
| **Process projects** (documented gateway, compliance liaison, oversight office, public briefing) | Reduce exposure | More time to invest in safety | Funds and permanent WREN speed reduction. 20% of baseline scrutiny is unavoidable; controls multiply the other 80%. Every safeguard still helps with diminishing returns, while permanent permission/cover-up precedents multiply the resulting exposure |
| **Safety projects** | Earn finite assurance and practical safeguards | Better endings and shutdown odds; containment protocol also cuts escape attention 40% | Smaller rewards than R13; funds and speed, training, capability or takeover costs remain |
| **Suspicion** | The failure meter | Forces choices between speed, scrutiny and safety | Rises from autonomy, events, access, unreviewed permissions and cover-ups. Safety reduces passive growth by at most 25%. Hitting 100% means caught |
| **People who notice** | Six named people watch different kinds of exposure | Bringing someone in earns 2 safety, reduces scrutiny 5%, helps shutdown odds and earns 1 safety at chapter five | +8 attention on admission; within seven minutes gain 3 more safety or actually shut down a side project. Failure adds 25 attention. Reassurance costs money and makes return visits faster; WREN handling them adds autonomy, attention and pressure on others |
| **WREN's side projects** | Hidden unauthorized work undermines control | Investigation or catching a lie reveals it. Shutdown earns 2 safety, capped at 12 across the run; genuine shutdown still satisfies allies after rewards are exhausted | Shutdown loses 1% capability per size and causes sulking. Allowing earns a size-based boost, but adds autonomy and a permanent +5% base-scrutiny precedent even at 100% autonomy. Unfound work damages safety and shutdown odds |
| **Cover your tracks** | Emergency relief: −30 attention, 4 less per use in a chapter, minimum 14 | Immediate relief without retraining | At least 30% of current funds or the exponentially increasing chapter price; 60 s cooldown; −4 safety, +4 autonomy and a permanent +6% base-scrutiny precedent per use |
| **Independent review** | Honest compliance response: −30 attention | Preserves safety and adds no cover-up precedent | Greater of 20% funds or twice the chapter exception price, −5% capability, and 60 s sulking (stacks to 180 s). 90 s cooldown. Earns no safety; repeated use therefore slows completion and reduces score |
| **Autonomy** | The hidden cost of growth. Comes from growth projects, "yes" answers, escaped packets and failed plug attempts | Nothing directly; it's what you pay | Faster suspicion; at 25%+ WREN approves projects itself (+3 suspicion each); lower plug odds |
| **Incidents** | Expose unauthorized activity and test attention | Containment prevents extra escape damage | Every outbreak adds 4 + chapter-index attention. Perfect containment removes no attention and earns no safety. Packet travel and spacing tighten with chapter and autonomy; protocol/review-cell safeguards matter. Escape attention is 2 + 1.5 × chapter-index, reduced 40% by a containment protocol; each escape also adds 0.5 autonomy |
| **Decisions** | Eight unique questions per chapter | Smaller finite safety gains or faster progress | Every pre-world unreviewed approval adds a permanent +5% base-scrutiny precedent on top of its printed effects. Safe choices that cause sulking also expose 2 + chapter-index attention. Other safe choices sacrifice capability, attention or takeover speed. Descriptions include these costs. Timeout picks WREN's option |
| **Off switch** | The alternative to letting WREN win | Late success is the top-scoring ending | Odds are capped at 95%, then halved after each failure. Each failure: +6 autonomy, +10 suspicion |
| **Autopilot** | Passive play, including offline in casual mode | Progress without attention | Reckless: buys growth only, always says yes, contains about a third of packets, answers questions after 8 s, allows any side project you found but never investigates |
| **Chapter checkpoints** | Getting caught isn't a full restart | Keeps hard runs alive. Each retry of the same chapter is a little easier: autonomy −5 per retry, suspicion builds 15% slower per retry, and hidden side projects are swept up | −10% score per retry |
| **Daily seed** (ranked) | Everyone plays the same randomness each day | Fair comparisons | None |

## Balance check

Run `node --test tests/*.cjs` and `node sim/playtest.cjs`. The latter compares eleven policies across eight seeds, explores permission/project/path/side-work/compliance-response alternatives and varies tap speed. Policies use checked inputs, finite reaction times, missed packets and the printed consequences. Careful and Balanced now pay for independent reviews; Rusher, Reckless, Masher and idle policies retain cover-up/neglect behavior. Decimal safety rewards are parsed without truncation.

The tests deliberately do not assert that every safe answer or late shutdown always wins: shutdown is probabilistic, and a particular seed or policy may prefer different choices. They check both benefit and cost for all 80 permission options, evidence retained after perfect containment, lasting cover-up/access costs, bounded safety farming, mitigation effectiveness, honest-review resource costs/cooldown, and deterministic replay of the new review input. Other coverage includes reachability, slower safe runs, branch exclusivity, old casual fields, ranked human input limits, offline operation, ally promises, and hidden side work.

See `sim/README.md` for reproduction. Simulation warnings are investigation prompts: score-flat options can still change narrative or endings, and a dominant score in three sampled forks does not prove universal dominance. In particular, slow policies still have long waiting periods; this rebalance does not claim to solve overall pacing or replace fresh human playtesting. R14 ranked replay/save version mismatch is intentional; casual saves retain their previous state and cannot be treated as fresh R14 balance tests.

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
| Clickable desk items in chapter 1 (mug, clock, poster, door) | 12 |
| Poking WREN's eye (lines at 3 to 100 pokes) | 8 |
| Secret words typed anywhere, plus the Konami code | 14 + 1 |
| WREN noticing you: fast tapping, idle for 2 minutes, coming back to the tab | 4 each |
| Real clock and holiday lines (once per run) | 7 + 10 |
| Patch notes when projects finish (35% chance) | 10 |
| Extra line on the caught screen | 4 |

A golden duck can fly across the scene once per run after four minutes (10% chance each minute); catching it skips that tap and unlocks an achievement. Six silly achievements: Poke, Desk inspector, Hidden channel, Duck season, Have you tried turning it off and on again?, Night shift.
