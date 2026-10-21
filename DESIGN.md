# Design notes

Every mechanism in the game exists to create a choice. This file lists each one with what it's for, what it costs, and how it was balanced. Numbers live in `index.html` (search for `TUNE`, `STAGES`, `PROJ`, `DEC`).

## The core tension

You want WREN to get more capable (that's the job, and capability is most of your score). Everything that makes it more capable also makes it more autonomous and draws more attention. Safety work slows you down but decides how the story ends. You can stop WREN at any point, but stopping early is worth very little.

## Score

`score = (progress + safety) × ending × time × retries`

| Part | How it's computed | Why |
|---|---|---|
| Progress | `100 × log10(1 + capability)`; takeover endings use capability at the start of chapter 5, plus 100 for finishing | Rewards building WREN up. Using the chapter 5 value stops stalling from paying off |
| Safety | `2 × safety score` | Safety is worth points on its own, not just a better ending |
| Ending | see table below | Makes the ending choice matter |
| Time | `1.3 − minutes / 100`, kept between 0.7 and 1.3 | Rewards finishing sooner, so rushing and safety pull against each other |
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
| **Hardware** | Compute sets how fast WREN can train on its data | Faster capability | Exponential prices; competes with projects and cover-ups for money |
| **Growth projects** | The main way WREN gets stronger | Big multipliers | Cost, plus suspicion (shown on loud ones) and autonomy |
| **Process projects** (documented gateway, compliance liaison, oversight office, public briefing) | Slow how fast suspicion builds | Make aggressive play survivable | Resources spent that don't grow WREN |
| **Safety projects** | Raise safety; some have side effects (slower packets, fewer incidents, −10 suspicion) | Better ending, more points, better plug odds | Money and time not spent on growth |
| **Suspicion** | The fail state. Grows faster with autonomy, slower with safety | Forces you to manage how loud you are | Hitting 100% ends the run (retry the chapter at a cost) |
| **Cover your tracks** | Emergency −30 suspicion | Saves a run | Price doubles each use in a chapter; 30 s cooldown |
| **Autonomy** | The hidden cost of growth. Comes from growth projects, "yes" answers, escaped packets and failed plug attempts | Nothing directly; it's what you pay | Faster suspicion; at 25%+ WREN approves projects itself (+3 suspicion each); lower plug odds |
| **Incidents** | Attention check. Rogue packets appear at random spots and must be tapped | Contain all: −6 suspicion and +1 safety for the first three perfect incidents per chapter | Each escape: +suspicion, +0.5 autonomy |
| **Decisions** | 8 per chapter, each a tradeoff between growth/quiet and safety. You see about 4–5 per run | Choosing well is a big part of safety | Saying no often makes WREN sulk (40% slower for 60 s) or costs suspicion. No answer in 20 s means WREN picks its own option |
| **Off switch** | The alternative to letting WREN win | Late success is the top-scoring ending | Odds are capped at 95%, then halved after each failure. Each failure: +6 autonomy, +10 suspicion |
| **Autopilot** | Passive play, including offline in casual mode | Progress without attention | Reckless: buys growth only, always says yes, contains about a third of packets, answers questions after 8 s |
| **Chapter checkpoints** | Getting caught isn't a full restart | Keeps hard runs alive | −10% score per retry |
| **Daily seed** (ranked) | Everyone plays the same randomness each day | Fair comparisons | None |

## Balance check

Scripted policies run through the real rules on seeds 1–3 with a 90-minute limit. They are repeatable checks of reachability and obvious shortcuts, not a substitute for human playtesting.

| Strategy | Score range | Ending | Time |
|---|---|---|---|
| Careful (one manual action every 2 s, misses some packets) | 1,220–1,244 | The Gardener | 58–59 min |
| Reckless (2.5 actions/s, no safety projects or packet taps) | 380–394 | The Optimizer | 32–34 min |
| Idle from start | No score | Unfinished | 90 min limit |

The careful policy spends roughly 1,750 manual actions, buys every safety project, chooses safety in each timed decision, and handles about three quarters of rogue packets. The reckless policy gets a lower-scoring ending despite tapping much faster. The test suite also checks the incident safety cap, offline chapter gate, and replay tap limit. It does not establish how an average person will play.

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
