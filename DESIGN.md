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
| **Work (tap)** | Ch. 1–2: early resources and training data. Ch. 3–4: each approval lowers suspicion by 0.02. Ch. 5: each ask (one per 3 s) adds 0.2 safety, up to +20 | Always available; matters in every chapter | Attention and time. Capped at 14 taps/s, 420/min, 3,000 per 10 min |
| **Hardware** | Compute sets how fast WREN can train on its data | Faster capability, once data is piling up | Exponential prices; competes with projects and cover-ups for money. In chapters 1–2 data usually runs out first, so extra compute does nothing; the training data stat says which one is the limit |
| **Growth projects** | The main way WREN gets stronger | Big multipliers | Cost, plus suspicion (shown on loud ones) and autonomy |
| **Upgrade path** | Four permanent two-way picks, one unlocked in each of the first four chapters | Speed or safety gains; repeating a side adds a chain bonus | You give up the other option. Speed raises autonomy or suspicion; safety cuts funds, WREN speed, training or takeover speed. WREN never chooses for you |
| **Process projects** (documented gateway, compliance liaison, oversight office, public briefing) | Slow how fast suspicion builds | Make aggressive play survivable | Resources spent that don't grow WREN |
| **Safety projects** | Raise safety; some have side effects (slower packets, fewer incidents) | Better ending, more points (up to 150 safety), better plug odds | Each one slows WREN: speed ×0.9, training ×0.85–0.9, capability −10% or takeover ×0.9 |
| **Suspicion** | The fail state. Grows faster with autonomy, slightly slower with safety (at most 25%) | Forces you to manage how loud you are | Hitting 100% ends the run (retry the chapter at a cost) |
| **Cover your tracks** | Emergency suspicion cut: −30, then 6 less each use in the same chapter (at least −12) | Saves a run | Costs a fifth of your funds or the chapter price (doubling each use), whichever is more; 40 s cooldown; +3 autonomy each use, so suspicion builds faster afterward. Once autonomy is at 100%, each use makes suspicion grow 10% faster instead |
| **Autonomy** | The hidden cost of growth. Comes from growth projects, "yes" answers, escaped packets and failed plug attempts | Nothing directly; it's what you pay | Faster suspicion; at 25%+ WREN approves projects itself (+3 suspicion each); lower plug odds |
| **Incidents** | Attention check. Rogue packets appear at random spots and must be tapped | Contain all: −6 suspicion and +1 safety for the first three perfect incidents per chapter | Each escape: +suspicion, +0.5 autonomy |
| **Decisions** | 8 per chapter, each a tradeoff between growth/quiet and safety. You see about 4–5 per run | Choosing well is a big part of safety | Every safe answer costs something: WREN sulks (40% slower for 60 s; more safe answers add 60 s each, up to 180 s, and the game shows the funds lost), suspicion rises, or (chapter 5) takeover slows. No answer in 20 s means WREN picks its own option |
| **Off switch** | The alternative to letting WREN win | Late success is the top-scoring ending | Odds are capped at 95%, then halved after each failure. Each failure: +6 autonomy, +10 suspicion |
| **Autopilot** | Passive play, including offline in casual mode | Progress without attention | Reckless: buys growth only, always says yes, contains about a third of packets, answers questions after 8 s |
| **Chapter checkpoints** | Getting caught isn't a full restart | Keeps hard runs alive | −10% score per retry |
| **Daily seed** (ranked) | Everyone plays the same randomness each day | Fair comparisons | None |

## Balance check

Scripted policies run through the real rules with a 90-minute limit. They are repeatable checks of reachability and obvious shortcuts, not a substitute for human playtesting.

| Strategy (seeds 1–5) | Score range | Ending | Time |
|---|---|---|---|
| Everything safe (one action every 2 s, buys every safety option, misses some packets) | 863–864 | The Gardener | 71–72 min |
| Balanced (same, but stops choosing safety at 150) | 946–986 | The Gardener | 61–63 min |
| Fast and attentive (one action every 0.8 s, no safety, contains packets) | 383–405 | The Optimizer | 29–33 min |
| Reckless (2.5 actions/s, no safety, ignores packets) | 66–94 | Caught in chapter 2 or 3 | 14–21 min |
| Idle from start | No score | Unfinished | 90 min limit |

Taking every safety option is no longer free: it makes the run about 20 minutes longer than stopping once the best ending is secured, and it scores less. Skipping safety is fastest but caps you at a worse ending, and leaning on cover-ups without handling incidents usually gets you caught, because each cover-up raises WREN's autonomy and suspicion then builds faster. The test suite checks these relationships, plus branch exclusivity, chain bonuses, old casual saves, the incident safety cap, the cover-up cooldown and cost, the offline chapter gate, and the replay tap limit. It does not establish how an average person will play.

## Content

Drawn from shuffled pools, so nothing repeats until its whole pool has been used:

| Pool | Size |
|---|---|
| Ambient WREN messages | 80 (16 per chapter) |
| Incidents | 32 (8 per chapter) |
| Decisions | 40 (8 per chapter) |
| Chapter 5 replies | 42 |
| Plug failure lines | 10 (escalating) |
| Self-approval, incident outcome, timeout, purchase lines | 3–6 variants each |
