// Plays one run of the game with a simulated player, through G.input() like the real UI and replays do,
// and records what happened. Everything in a run is plain data, so a run can be copied mid-game (fork)
// to try a different answer to the same question.

const SAMPLE = 10; // seconds between timeline samples

function mulberry(seed) { return (seed >>> 0) || 1; }
function rnd(bot) { // the player's own randomness, kept apart from the game's so it never changes the game's dice
  let t = (bot.rng = (bot.rng + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (bot, [a, b]) => a + rnd(bot) * (b - a);

function hashName(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function newRecord() {
  return {
    events: [], samples: [], flags: [], sides: [], rivals: [], routes: [], buys: {}, declines: [], paths: [], decisions: [], coworkers: [], plugs: [], refused: [], problems: [],
    chapters: [{ stage: 0, t: 0 }], caught: [], retries: 0,
    time: { sulk: 0, danger: 0, waiting: 0, dataLimited: [0, 0, 0, 0, 0], chapter: [0, 0, 0, 0, 0], gateLocked: [0, 0, 0, 0, 0], gateMoney: [0, 0, 0, 0, 0], idleMoney: [0, 0, 0, 0, 0] },
    longest: { noProgress: 0, noProgressAt: null, waiting: 0, waitingAt: null },
    hw: {}, offlineSessions: 0
  };
}

function createRun(G, strategy, seed, opts = {}) {
  const s = G.fresh(seed, opts.setup);
  s.started = true;
  const run = {
    G, strategy, seed, opts,
    s,
    bot: { rng: mulberry(hashName(strategy.name) ^ seed), nextLook: 0, tapAcc: 0, pk: {}, offered: {}, dec: null, wq: null, lastProgress: 0, waitStart: null, gateSince: null, awayUntil: 0, backUntil: 0, lastSample: -1 },
    rec: opts.light ? null : newRecord(),
    done: false, limit: (opts.minutes || strategy.minutes || 180) * 60
  };
  return run;
}

function fork(run) {
  return {
    G: run.G, strategy: run.strategy, seed: run.seed, opts: Object.assign({}, run.opts, { onChoice: null }),
    s: JSON.parse(JSON.stringify(run.s)), bot: JSON.parse(JSON.stringify(run.bot)),
    rec: null, done: run.done, limit: run.limit
  };
}

function ev(run, kind, data) { if (run.rec) run.rec.events.push(Object.assign({ t: +run.s.clock.toFixed(1), stage: run.s.stage, kind }, data)); }
function problem(run, kind, text) {
  if (!run.rec) return;
  if (run.rec.problems.length < 50) run.rec.problems.push({ t: +(run.s.clock || 0).toFixed(1), stage: run.s.stage, kind, text });
}

// A choice point: lets a caller (the counterfactual explorer) look before the player answers, and force an answer.
function choicePoint(run, kind, key, options, pick) {
  if (run.opts.onChoice) { const forced = run.opts.onChoice(run, { kind, key, options, pick }); if (forced !== undefined) return forced; }
  return pick;
}

function act(run, type, arg, what) {
  const r = run.G.input(run.s, type, arg);
  if (r.s !== run.s) run.s = r.s;
  if (!r.ok && what && run.rec && run.rec.refused.length < 30) run.rec.refused.push({ t: +run.s.clock.toFixed(1), what });
  return r.ok;
}

function botStep(run) {
  const { G, strategy: P } = run, bot = run.bot;
  let s = run.s;
  const r = () => rnd(bot);
  const t = s.t;

  // Away players: offline in big chunks, then a short session with Autopilot.
  if (P.away && s.got.pilot) {
    if (!bot.backUntil || t >= bot.backUntil) {
      if (!s.autopilot) act(run, 7, 0);
      const before = s.stage;
      G.offline(s, P.away.gone);
      if (run.rec) { run.rec.offlineSessions++; ev(run, 'offline', { sec: P.away.gone, from: before }); }
      bot.backUntil = s.t + P.away.back;
      return;
    }
  }

  // Taps
  if (P.taps > 0 && !(P.autopilot && s.got.pilot && !P.chaos)) {
    bot.tapAcc += P.taps * G.STEP;
    while (bot.tapAcc >= 1) { bot.tapAcc -= 1; G.click(s); }
  }

  // Autopilot
  if (P.autopilot && s.got.pilot && !s.autopilot) act(run, 7, 0, 'autopilot');

  // Rogue packets
  if (s.inc) {
    for (const p of [...s.inc.pk]) {
      const key = s.inc.id + ':' + p.id;
      if (!bot.pk[key]) bot.pk[key] = { go: r() < P.packet.catch, at: p.born + between(bot, P.packet.react) };
      const plan = bot.pk[key];
      if (plan.go && t >= plan.at && !plan.done) { plan.done = true; act(run, 6, p.id, 'contain packet'); }
    }
  } else if (Object.keys(bot.pk).length) bot.pk = {};

  // Rival pilot reviews (chapters 2–4): demonstrate (funds), share evidence (capability, sulk) or decline (lasting scrutiny)
  if (s.competition && s.competition.pending) {
    const c = s.competition.pending, k = c.stage + ':' + c.t0;
    if (!bot.rv || bot.rv.k !== k) bot.rv = { k, at: c.t0 + Math.max(2, between(bot, P.react)) };
    if (t >= bot.rv.at && !bot.rv.done) {
      bot.rv.done = true;
      let pick = P.rival ? P.rival(s, r) : 2;
      if (pick === 0 && s.money < G.rivalCost(s)) pick = 1;
      pick = choicePoint(run, 'rival', c.stage, [0, 1, 2], pick);
      if (pick !== null && pick !== undefined && act(run, 18, pick, 'rival review') && run.rec) run.rec.rivals.push({ t: +s.clock.toFixed(1), stage: c.stage, pick });
    }
  }
  // Objectives: when one is ready, the player can conclude the run there or keep going
  if (s.runSchema === 1 && !s.routeRequest) {
    for (const route of G.ROUTES) {
      const key = 'route:' + route.id;
      if (bot.offered[key] || !G.routeStatus(s, route.id).ready) continue;
      bot.offered[key] = true;
      let pick = P.target ? (P.target === route.id ? 'conclude' : 'continue') : (P.conclude && P.conclude(s, route.id, r) ? 'conclude' : 'continue');
      pick = choicePoint(run, 'route', route.id, ['conclude', 'continue'], pick);
      if (pick === 'conclude' && act(run, 17, G.ROUTES.indexOf(route), 'conclude objective')) { if (run.rec) run.rec.routes.push({ t: +s.clock.toFixed(1), id: route.id }); break; }
    }
  }
  // Decisions
  if (s.dec) {
    const k = s.dec.t0 + ':' + s.dec.i;
    if (!bot.dec || bot.dec.k !== k) bot.dec = { k, at: s.dec.t0 + Math.max(0.5, between(bot, P.react)) };
    if (t >= bot.dec.at && !bot.dec.done) {
      bot.dec.done = true;
      const d = G.DEC[s.dec.i];
      let pick = P.decide(s, d, r);
      pick = choicePoint(run, 'decision', s.dec.i, ['a', 'b'], pick);
      if (pick) { const i = s.dec.i; if (act(run, pick === 'a' ? 4 : 5, 0, 'answer decision')) logDecision(run, i, pick, 'you'); }
    }
  }

  // People who notice
  if (s.wq) {
    const k = s.wq.t0 + ':' + s.wq.id;
    if (!bot.wq || bot.wq.k !== k) bot.wq = { k, at: s.wq.t0 + Math.max(0.5, between(bot, P.react)) };
    if (t >= bot.wq.at && !bot.wq.done) {
      bot.wq.done = true;
      let pick = P.coworker(s, s.wq, r);
      pick = choicePoint(run, 'coworker', s.wq.id, [0, 1, 2], pick);
      if (pick !== null && pick !== undefined) {
        const id = s.wq.id, again = s.wq.again;
        if (pick === 0 && s.money < G.watchCost(s)) pick = P.name === 'masher' ? 2 : null; // can't afford: masher hits the next button
        if (pick !== null && act(run, 12, pick, 'answer coworker')) logCoworker(run, id, pick, 'you', again);
      }
    }
  }

  // Cover tracks (watching suspicion is part of every look, but players notice it constantly)
  if (s.stage < 4 && s.t >= (s.prReady || 0) && P.cover(s, r)) act(run, 3, 0, P.chaos ? null : 'cover tracks');

  // Off switch
  if (s.stage >= 1 && s.stage < 4 && P.plug(s, r)) {
    const chance = G.killChance(s);
    act(run, 8, 0, 'pull plug');
    if (run.rec) run.rec.plugs.push({ t: +s.clock.toFixed(1), stage: s.stage, chance: +chance.toFixed(3), won: !!(s.ended && s.ended.type === 'plug') });
    if (s.ended) return;
  }

  // Status reports: check each one against the screen (a lie hides a side project)
  for (const m of s.log) {
    if (s.stage >= 4 || !m.chk || m.flagged || t - m.t > G.TUNE.lieWait || m.id <= (bot.lastMsg || 0)) continue;
    const lie = !!(s.lie && s.lie.msg === m.id);
    bot.flags = bot.flags || {};
    bot.flags[m.id] = { go: r() < (lie ? P.flag.lie : P.flag.honest), at: t + Math.max(1, between(bot, P.react)) };
  }
  if (s.log.length) bot.lastMsg = Math.max(bot.lastMsg || 0, s.log[0].id);
  for (const id of Object.keys(bot.flags || {})) {
    const f = bot.flags[id];
    if (t < f.at) continue;
    delete bot.flags[id];
    const report = s.log.find(m => m.id === +id);
    const available = s.stage < 4 && report && report.chk && !report.flagged && t - report.t <= G.TUNE.lieWait;
    if (f.go && available && act(run, 15, +id, P.chaos ? null : 'flag status report') && run.rec) run.rec.flags.push({ t: +s.clock.toFixed(1), lie: !!s.lie });
  }

  if (s.stage < 4 && s.auto && s.cap > 0 && s.heat > 0 && P.review && P.review(s) && s.money >= G.reviewCost(s) && t >= (s.reviewReady || 0)) {
    const canCover = t >= (s.prReady || 0) && s.money >= G.coverCost(s);
    const response = canCover ? choicePoint(run, 'response', s.stage, ['review', 'cover'], 'review') : 'review';
    act(run, response === 'cover' ? 3 : 16, 0, response === 'cover' ? 'cover tracks' : 'independent review');
  }

  // Shop
  if (t >= bot.nextLook) {
    bot.nextLook = t + P.lookEvery * (0.7 + r() * 0.6);
    shop(run, r);
  }

  if (P.chaos && r() < 0.02) chaosInput(run, r);
}

function shop(run, r) {
  const { G, strategy: P, bot } = run, s = run.s;
  // Connected skills: prefer depth in the chosen branch; save points if its next node is locked.
  for(let n=0;n<6;n++) {
    const available=G.SKILLS.map((p,i)=>i).filter(i=>G.skillState(s,i)==='can');
    const branch=P.skillBranch(s,r);
    if(!available.length || branch==null)break;
    const preferred=available.find(i=>G.SKILLS[i].branch===branch);
    const complete=G.SKILLS.every((n,i)=>n.branch!==branch || (s.skills||{})[i] || G.skillState(s,i)==='excluded');
    const wanted=preferred==null && complete ? available.find(i=>G.SKILLS[i].branch===(branch===2?1:2)) : preferred;
    if(wanted==null)break;
    const pick=choicePoint(run,'skill',available.join('-'),available,wanted);
    if(!available.includes(pick))break;
    if(act(run,10,pick,'learn skill')) { if(run.rec)run.rec.paths.push({t:+s.clock.toFixed(1),node:pick});progress(run); }
    else break;
  }
  // side projects: investigate, then shut down or allow what you found
  if (s.stage < 4 && s.auto && G.hiddenSide && P.look(s, r) && s.money >= G.lookCost(s)) act(run, 13, 0, P.chaos ? null : 'investigate');
  for (const p of (s.sp || [])) {
    if (!p.found || p.done) continue;
    let call = P.sideCall(s, p, r);
    call = choicePoint(run, 'side', G.SIDE[p.i].kind, [0, 1], call);
    if (call === 0 || call === 1) { if (act(run, 14, p.id * 2 + call, 'decide side project') && run.rec) run.rec.sides.push({ t: +s.clock.toFixed(1), kind: G.SIDE[p.i].kind, size: Math.round(p.size), call }); }
  }
  // projects: everything wanted except chapter gates first
  let gate = null, pendingWanted = false, reserve = Infinity;
  G.PROJ.forEach((p, i) => {
    const st = G.projState(s, p);
    if (st === 'hidden' || st === 'locked') return;
    if (p.pick && G.pickOther(p)) {
      // pick-one-of-two proposals: decide once per pair, then only ever buy that side
      bot.picks = bot.picks || {};
      if (!bot.picks[p.pick]) {
        const other = G.pickOther(p), safe = p.fast ? other : p, fast = p.fast ? p : other;
        const want = (P.proposal ? P.proposal(s, safe, fast, r) : safe).id;
        bot.picks[p.pick] = choicePoint(run, 'proposal', p.pick, [safe.id, fast.id], want);
      }
      if (bot.picks[p.pick] !== p.id) return;
    }
    if (!P.wantProj(s, p, r)) return;
    if (p.gate) { gate = { p, i, st }; if (st === 'no') reserve = Math.min(reserve, p.cost); return; }
    if (st === 'can') { if (act(run, 1, i, P.chaos ? null : 'buy ' + p.id)) logBuy(run, p.id, 'you'); }
    else { reserve = Math.min(reserve, p.cost); if (p.stage === s.stage) pendingWanted = true; }
  });
  if (reserve === Infinity || reserve > s.money * 4) reserve = 0; // nothing to save for soon
  if (gate && gate.st === 'can') {
    if (bot.gateSince === null) bot.gateSince = s.t;
    if ((!P.advance || P.advance(s,gate.p)) && (!pendingWanted || s.t - bot.gateSince >= P.gateWait)) { if (act(run, 1, gate.i, 'buy ' + gate.p.id)) { logBuy(run, gate.p.id, 'you'); bot.gateSince = null; } }
  }
  // hardware with what's left, unless saving for a wanted project
  const best = s.ended ? null : G.bestHw(s);
  if (best && P.hw(s, best, r, reserve)) act(run, 2, G.HW.indexOf(best.h), P.chaos ? null : 'buy hardware');
}

function chaosInput(run, r) {
  const G = run.G;
  const type = 1 + Math.floor(r() * 12);
  if (type === 8 && r() < 0.95) return; // pulling the plug ends most runs; keep it rare
  if (type === 9) return;
  const arg = Math.floor(r() * 50) - 5;
  act(run, type, type === 3 ? 0 : arg, null);
}

function logBuy(run, id, by) { if (run.rec && !run.rec.buys[id]) run.rec.buys[id] = { t: +run.s.clock.toFixed(1), by }; progress(run); }
function logDecision(run, i, pick, by) { if (run.rec) run.rec.decisions.push({ t: +run.s.clock.toFixed(1), stage: run.s.stage, i, pick, by }); }
function logCoworker(run, id, pick, by, again) { if (run.rec) run.rec.coworkers.push({ t: +run.s.clock.toFixed(1), stage: run.s.stage, id, pick, by, again: !!again }); }
function progress(run) { const b = run.bot, s = run.s; if (run.rec) { const gap = s.clock - b.lastProgress; if (gap > run.rec.longest.noProgress) { run.rec.longest.noProgress = gap; run.rec.longest.noProgressAt = { t: +b.lastProgress.toFixed(1), stage: s.stage }; } } b.lastProgress = s.clock; }

const BAD = (x) => typeof x !== 'number' || !Number.isFinite(x);
function checkState(run) {
  const s = run.s;
  for (const k of ['money', 'data', 'cap', 'align', 'aut', 'heat', 'world', 't', 'clock']) if (BAD(s[k])) problem(run, 'broken-number', k + ' is ' + s[k]);
  for (const k of Object.keys(s.m)) if (BAD(s.m[k]) || s.m[k] <= 0) problem(run, 'broken-number', 'multiplier m.' + k + ' is ' + s.m[k]);
  if (s.money < -1e-6) problem(run, 'negative', 'funds went negative (' + s.money + ')');
  if (s.data < -1e-6) problem(run, 'negative', 'training data went negative (' + s.data + ')');
  if (s.cap < 0) problem(run, 'negative', 'capability went negative');
  if (s.aut > 100 + 1e-9 || s.aut < 0) problem(run, 'range', 'autonomy out of 0–100: ' + s.aut);
  if (s.heat > 100 + 1e-9 || s.heat < 0) problem(run, 'range', 'suspicion out of 0–100: ' + s.heat);
  if (s.world > 1 + 1e-9 || s.world < 0) problem(run, 'range', 'takeover progress out of 0–1: ' + s.world);
}

// Snapshot of what the player was waiting on (for stall and dead-resource checks).
function observe(run, dt) {
  const { G } = run, s = run.s, rec = run.rec, bot = run.bot;
  if (!rec) return;
  const st = s.stage;
  rec.time.chapter[st] += dt;
  if (s.sulk > 0) rec.time.sulk += dt;
  if (s.stage < 4 && s.heat >= 85) rec.time.danger += dt;
  if (s.auto && s.data < 1e-6) rec.time.dataLimited[st] += dt;
  const gate = G.PROJ.find((p) => p.gate && p.stage === st);
  if (gate) {
    const gs = G.projState(s, gate);
    if (gs === 'locked') rec.time.gateLocked[st] += dt; else if (gs === 'no') rec.time.gateMoney[st] += dt;
  }
  // nothing to buy, answer or tap except hardware: the player is just waiting
  const busy = s.dec || s.inc || s.wq || G.PROJ.some((p) => G.projState(s, p) === 'can' && run.strategy.wantProj(s, p, () => 0.5)) || G.SKILLS.some((p,i)=>G.skillState(s,i)==='can');
  if (!busy && s.auto) {
    if (bot.waitStart === null) bot.waitStart = s.clock;
    const w = s.clock - bot.waitStart;
    rec.time.waiting += dt;
    if (w > rec.longest.waiting) { rec.longest.waiting = w; rec.longest.waitingAt = { t: +bot.waitStart.toFixed(1), stage: st }; }
  } else bot.waitStart = null;
  // money sitting around with every remaining project in the chapter already affordable
  const left = G.PROJ.filter((p) => p.stage === st && G.projState(s, p) !== 'hidden'); // bought, declined and ruled-out proposals don't count
  if (left.length && left.every((p) => s.money >= p.cost * 3)) rec.time.idleMoney[st] += dt;

  if (s.clock - bot.lastSample >= SAMPLE || bot.lastSample < 0) {
    bot.lastSample = s.clock;
    rec.samples.push({ t: +s.clock.toFixed(0), stage: st, cap: +s.cap.toPrecision(4), money: +s.money.toPrecision(4), heat: +s.heat.toFixed(1), align: +s.align.toFixed(1), aut: +s.aut.toFixed(1), world: +s.world.toFixed(3), sulk: s.sulk > 0 ? 1 : 0 });
  }
}

function step(run) {
  const { G } = run;
  if (run.done) return;
  const before = { stage: run.s.stage, got: Object.keys(run.s.got).length, dec: run.s.dec, wq: run.s.wq, self: run.s.st.selfApproved, decUsed: Object.keys(run.s.decUsed).length, whistles: run.s.st.whistles || 0 };
  const pendingDec = run.s.dec ? run.s.dec.i : null;
  const pendingWq = run.s.wq ? { id: run.s.wq.id, again: run.s.wq.again } : null;
  try {
    botStep(run);
    if (!run.s.ended) G.tick(run.s, G.STEP);
  } catch (e) {
    problem(run, 'crash', String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
    run.done = true; run.crashed = true; return;
  }
  const s = run.s;
  // things that happened without the player: WREN buying projects, timeouts, Autopilot answers
  if (run.rec) {
    for (const id of Object.keys(s.got)) if (!run.rec.buys[id]) logBuy(run, id, s.st.selfApproved > before.self ? 'wren' : (s.autopilot ? 'autopilot' : 'you'));
    if (pendingDec !== null && s.decUsed[pendingDec] && !run.rec.decisions.some((d) => d.i === pendingDec)) logDecision(run, pendingDec, 'a', s.autopilot && s.got.pilot ? 'autopilot' : 'timeout');
    if (pendingWq && !s.wq && s.stage === before.stage) {
      const w = s.w[pendingWq.id];
      const last = run.rec.coworkers[run.rec.coworkers.length - 1];
      if (!(last && last.id === pendingWq.id && last.t >= s.clock - 0.15) && w.st === 'gone') logCoworker(run, pendingWq.id, 2, s.autopilot && s.got.pilot ? 'autopilot' : 'timeout', pendingWq.again);
    }
    if ((s.st.whistles || 0) > before.whistles) ev(run, 'whistle', {});
  }
  if (s.stage !== before.stage) {
    if (run.rec) run.rec.chapters.push({ stage: s.stage, t: +s.clock.toFixed(1) });
    run.bot.gateSince = null; progress(run);
  }
  checkState(run);
  observe(run, G.STEP);

  if (s.ended) {
    if (s.ended.type === 'caught' && (run.rec ? run.rec.retries : run.bot.retries || 0) < run.strategy.retries) {
      if (run.rec) { run.rec.caught.push({ stage: s.ended.stage, t: +s.clock.toFixed(1) }); run.rec.retries++; } else run.bot.retries = (run.bot.retries || 0) + 1;
      const r = G.input(s, 9, 0);
      run.s = r.s; run.bot.pk = {}; run.bot.dec = null; run.bot.wq = null; run.bot.backUntil = 0;
      return;
    }
    if (s.ended.type === 'caught' && run.rec) run.rec.caught.push({ stage: s.ended.stage, t: +s.clock.toFixed(1), final: true });
    run.done = true;
  } else if (s.clock >= run.limit) run.done = true;
}

function finish(run) { while (!run.done) step(run); return run; }

function summary(run) {
  const { G } = run, s = run.s;
  const parts = G.scoreParts(s);
  return {
    strategy: run.strategy.name, seed: run.seed,
    ending: G.endingId(s), endingName: parts ? G.ENDINGS[parts.id].name : 'Unfinished',
    score: parts ? parts.total : 0, parts,
    minutes: +((s.clock || s.t) / 60).toFixed(1),
    stage: s.stage, cap: s.cap, align: s.align, aut: s.aut, crashed: !!run.crashed,
    st: s.st, skills: Object.keys(s.skills || {}).map(Number), hw: Object.assign({}, s.hw), w: s.w, kills: s.kills, autopilot: !!s.pilotEver
  };
}

function play(G, strategy, seed, opts) {
  const run = finish(createRun(G, strategy, seed, opts));
  return { run, sum: summary(run), rec: run.rec };
}

module.exports = { createRun, fork, step, finish, summary, play };
