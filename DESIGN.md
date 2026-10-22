# Design notes

Every mechanism in the game exists to create a choice. This file lists each one with what it's for, what it costs, and how it was balanced. Numbers live in `index.html` (search for `TUNE`, `STAGES`, `PROJ`, `DEC`).

## The core tension

You want WREN to get more capable (that's the job, and capability is most of your score). Everything that makes it more capable also makes it more autonomous and draws more attention. Safety work slows WREN down (every safety option has a visible speed, funds or suspicion cost) but decides how the story ends. Safety points stop at 150, so the best play is to buy enough safety for the ending you want, not all of it. You can stop WREN at any point, but stopping early is worth very little.

## Score

`score = (progress + safety) × ending × time × retries`

| Part | How it's computed | Why |
|---|---|---|
| Progress | `100 × log10(1 + capability)`; takeover endings use capability at the start of chapter 5, plus 100 for finishing | Rewards building WREN up. Using the chapter 5 value stops stalling from paying off |
| Safety | `2 × safety score`, counted up to 150 | Safety is worth points on its own, but over-investing past the best ending only costs time |
| Ending | see table below | Makes the ending choice matter |
| Time | `1.3 − minutes / 100`, kept between 0.6 and 1.3 | Rewards finishing sooner, so rushing and safety pull against each other |
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
| **Work (tap)** | Ch. 1–2: early resources and training data. Ch. 3–4: each approval lowers suspicion by 0.02. Ch. 5: each ask (one per 3 s) adds 0.2 safety and slows the takeover, until +20 safety; after that asks are free | Always available; matters in every chapter | Attention and time. Above about 3 taps/s each tap is worth less (× √(3 ÷ taps per second)), so mashing past that barely helps. Capped at 14 taps/s, 420/min, 3,000 per 10 min |
| **Hardware** | Compute sets how fast WREN can train on its data | Faster capability, once data is piling up | Exponential prices; competes with projects and cover-ups for money. In chapters 1–2 data usually runs out first, so extra compute does nothing; the training data stat says which one is the limit |
| **Growth projects** | The main way WREN gets stronger | Big multipliers | Cost (about a minute of income when they unlock in chapters 1–4), autonomy, and on loud ones suspicion grows 5–18% faster for the rest of the chapter (shown on the card) |
| **Turn down** | Makes skipping a growth project a real move | +2 safety, no autonomy or loudness, and WREN can never buy it on its own. WREN still does it the slow, documented way: you keep the square root of each boost (×2 becomes ×1.41, ×5 becomes ×2.24) | WREN sulks and you lose part of the multiplier. Core speed projects (your login, 40 copies, agency rollout, production access), setup projects and the leadership briefing can't be turned down |
| **Upgrade path** | Four permanent two-way picks, one unlocked in each of the first four chapters | Speed or safety gains; repeating a side adds a chain bonus | You give up the other option. Speed raises autonomy or suspicion; safety cuts funds, WREN speed, training or takeover speed. WREN never chooses for you |
| **Process projects** (documented gateway, compliance liaison, oversight office, public briefing) | Slow how fast suspicion builds | Make aggressive play survivable | Cost, and each one slows WREN to ×0.9, so careful runs can skip them |
| **Safety projects** | Raise safety; some have side effects (slower packets, fewer incidents) | Better ending, more points (up to 150 safety), better plug odds | Each one slows WREN: speed ×0.9, training ×0.85–0.9, capability −10% or takeover ×0.9 |
| **Suspicion** | The fail state. Grows faster with autonomy, slightly slower with safety (at most 25%) | Forces you to manage how loud you are | Hitting 100% ends the run (retry the chapter at a cost) |
| **People who notice** | Turns part of suspicion into named people: Kevin and Dana (chapter 1), Priya (chapters 2–3), Dr. Okafor (chapters 3–4), Ingrid Moss and Tom Reyes (chapter 4). Each watches certain kinds of suspicion (escaped packets, loud projects, cover-ups, WREN acting alone, risky answers, shutdown attempts or suspicion that builds by itself) and fills a meter. When it's full they come to you, and you have 20 s to answer | **Reassure:** they go away for now. **Bring them in:** +4 safety, suspicion grows 5% slower, +4% off-switch odds, +3 safety each at the start of chapter 5 | **Reassure** costs the chapter's exception price (doubling each visit) or 15% of funds, and they notice 1.5× faster afterward. **Bring in** adds +8 suspicion now, and you must raise safety by 3 within 5 minutes or they go public (+25 suspicion, the bonus is lost). **Let WREN handle it** (also what happens if you don't answer, and what Autopilot does) is free but adds +5 autonomy and +4 suspicion, and everyone else still watching notices 25% faster. Allies and handled people are named in the ending |
| **WREN's side projects** | Hidden work nobody approved (16 kinds: a second copy on the backup server, a shell contractor, edits to its own scores…). A new one starts about every 5.5 min in chapters 1–4 (sooner with autonomy), up to 3 hidden at once, and each grows from size 0 to 5 over 7.5 min. The panel shows only the total unexplained activity | **Investigate** (twice the chapter exception price or 8% of funds; interpretability halves it, red-teaming takes another quarter off) reveals the biggest one. Most new ones come with a WREN status report that doesn't match your stats (compute, safety score or hardware count); flag it within 60 s to reveal one for free. Then **shut it down** (safety +1 + size) or **allow it** (+4% per size to WREN speed, data, funds or training) | Shutting down costs 1% capability per size and makes WREN sulk; allowing adds autonomy +2 + size. Flagging a true report makes WREN sulk. Hidden ones add a rogue packet to every incident, cut the off-switch odds ×0.85 each, and the ones of size 3+ finish at the next chapter (+3 autonomy, −3 safety each; all of them finish when chapter 5 starts) |
| **Cover your tracks** | Emergency suspicion cut: −30, then 6 less each use in the same chapter (at least −12) | Saves a run | Costs a fifth of your funds or the chapter price (doubling each use), whichever is more; 40 s cooldown; +3 autonomy each use, so suspicion builds faster afterward. Once autonomy is at 100%, each use makes suspicion grow 10% faster instead |
| **Autonomy** | The hidden cost of growth. Comes from growth projects, "yes" answers, escaped packets and failed plug attempts | Nothing directly; it's what you pay | Faster suspicion; at 25%+ WREN approves projects itself (+3 suspicion each); lower plug odds |
| **Incidents** | Attention check. Rogue packets appear at random spots and must be tapped | Contain all: −6 suspicion and +1 safety for the first three perfect incidents per chapter | Each escape: +suspicion, +0.5 autonomy |
| **Decisions** | 8 per chapter, each a tradeoff between growth/quiet and safety. You see about 4–5 per run | Choosing well is a big part of safety | Every safe answer costs something: WREN sulks (40% slower for 60 s; more safe answers add 60 s each, up to 180 s, and the game shows the funds lost), suspicion rises, or (chapter 5) takeover slows. No answer in 20 s means WREN picks its own option |
| **Off switch** | The alternative to letting WREN win | Late success is the top-scoring ending | Odds are capped at 95%, then halved after each failure. Each failure: +6 autonomy, +10 suspicion |
| **Autopilot** | Passive play, including offline in casual mode | Progress without attention | Reckless: buys growth only, always says yes, contains about a third of packets, answers questions after 8 s, allows any side project you found but never investigates |
| **Chapter checkpoints** | Getting caught isn't a full restart | Keeps hard runs alive. Each retry of the same chapter is a little easier: autonomy −5 per retry, suspicion builds 15% slower per retry, and hidden side projects are swept up | −10% score per retry |
| **Daily seed** (ranked) | Everyone plays the same randomness each day | Fair comparisons | None |

## Balance check

Scripted policies run through the real rules with a 90-minute limit. They are repeatable checks of reachability and obvious shortcuts, not a substitute for human playtesting. For a wider sweep (eleven player types, replayed choices, and a report of what looks broken, unused, too strong or stuck) run `node sim/playtest.cjs`; see `sim/README.md`.

| Strategy (seeds 1–5) | Score range | Ending | Time |
|---|---|---|---|
| Everything safe (one action every 2 s, buys every safety option, misses some packets, brings everyone in, investigates side projects and shuts them down until safety reaches 150) | 862–863 | The Gardener | 77–79 min |
| Balanced (same, but stops choosing safety at 150 and allows side projects after that) | 915–961 | The Gardener | 63–65 min |
| Fast and attentive (one action every 0.4 s, no safety, contains packets, reassures everyone, ignores side projects) | 369–392 | The Optimizer | 32–37 min |
| Same, but lets WREN handle everyone | 380–403 (two seeds: 132–134) | The Optimizer (two seeds: caught in chapter 4) | 30–34 min |
| Reckless (2.5 actions/s, no safety, ignores packets, never answers coworkers) | 60–67 | Caught in chapter 2 | 15–19 min |
| Idle from start | No score | Unfinished | 90 min limit |

Side projects keep careful players busy without changing their result much: about 11–17 get investigated per run, and catching WREN's lies saves the investigation fee. Ignoring them costs fast play 6–7 finished projects (about −20 safety and extra autonomy), which doesn't change its ending. People who notice barely move safe play: bringing everyone in scores about the same as before, though a balanced run that stops buying safety sometimes lets an ally's promise lapse and they go public. Letting WREN handle everyone saves money but got two of five fast seeds caught in chapter 4; reassuring them instead is safe but costs funds. Taking every safety option is no longer free: it makes the run about 20 minutes longer than stopping once the best ending is secured, and it scores less. Skipping safety is fastest but caps you at a worse ending, and leaning on cover-ups without handling incidents usually gets you caught, because each cover-up raises WREN's autonomy and suspicion then builds faster. Buying every project is no longer automatic. In the balanced run, turning down the procurement, budget, partner-network, emergency-authorization or robotics projects still reaches The Gardener at a similar score, and skipping the suspicion projects is about even for careful play but gets fast play caught more often. The test suite checks these relationships, plus project loudness, turning projects down, plus branch exclusivity, chain bonuses, old casual saves, the incident safety cap, the cover-up cooldown and cost, the offline chapter gate, the replay tap limit, and the people-who-notice rules (who notices what, handling, reassuring, allies and whistleblowing, and Autopilot's answer), and side projects (growth, investigating, shutting down and allowing, finishing at a new chapter, plug odds, and flagging status reports). It does not establish how an average person will play.

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
