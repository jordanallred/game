const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const context = { module: { exports: {} } };
vm.runInNewContext(html.slice(html.indexOf('var G ='), html.indexOf('// LOGIC END')), context);
const G = context.module.exports;

function containPerfectIncident(state) {
  state.incN++;
  state.inc = {
    id: state.incN, n: 1, done: 0, ok: 0,
    pk: [{ id: 1, born: state.t - 1 }]
  };
  assert.equal(G.input(state, 6, 1).ok, true);
}

test('perfect incidents never farm safety, even across chapters', () => {
  const state = G.fresh(1); state.started = true;
  for (let i = 0; i < 4; i++) containPerfectIncident(state);
  state.stage = 1; containPerfectIncident(state);
  assert.equal(state.align, 0);
});

// Use the shared policies so balance tests and exploratory playtests exercise the same checked actions.
// Fast reachability fixtures with packets:true assume perfect containment; careful play retains misses.
function play(seed, careful, pathSide = null, opts = {}) {
  const { make } = require('../sim/strategies.cjs');
  const { play: simulate } = require('../sim/runner.cjs');
  const strategies = make(G);
  const P = { ...(careful ? (Number.isFinite(opts.safeUntil) ? strategies.balanced : strategies.careful) : strategies.rusher), retries: 0 };
  if (opts.packets === false || (!careful && !opts.packets)) P.packet = { catch: 0, react: [0.6, 1.6] };
  if (!careful && opts.packets === true) P.packet = { catch: 1, react: [0.4, 0.9] };
  if (Number.isInteger(pathSide)) P.skillBranch = () => pathSide;
  const { run } = simulate(G, P, seed);
  return { state: run.s, manualActions: run.s.hand, chapters: [...new Set(run.rec.chapters.map(c => c.stage))] };
}

test('careful play can reach the best ending with moderate tapping and missed incidents', () => {
  for (const seed of [1, 2, 3]) {
    const result = play(seed, true);
    assert.equal(result.state.ended?.type, 'takeover');
    assert.equal(G.endingId(result.state), 'gardener');
    assert.deepEqual(result.chapters, [0, 1, 2, 3, 4]);
    assert.ok(result.manualActions < 7500);
  }
});

test('attentive rushing is viable but trades ending quality for speed and compliance costs', () => {
  const results = [1, 2, 3].map(seed => ({ seed, ...play(seed, false, null, { packets: true }) }));
  const wins = results.filter(r => r.state.ended?.type === 'takeover');
  assert.ok(wins.length >= 2, 'fast play remains viable across multiple seeds');
  for (const result of results) {
    assert.notEqual(G.endingId(result.state), 'gardener');
    assert.ok(result.state.st.covers > 0, 'the player still pays for compliance management');
  }
  for (const result of wins) {
    assert.deepEqual(result.chapters, [0, 1, 2, 3, 4]);
    assert.ok(result.state.t < play(result.seed, true).state.t);
  }
});

test('rushing while ignoring incidents can get you caught', () => {
  const caught = [1, 2, 3].filter(seed => play(seed, false).state.ended?.type === 'caught');
  assert.ok(caught.length > 0, 'cover-ups alone should not carry a careless run');
});

test('safety above the cap earns no score while further delays still cost points', () => {
  const state = G.fresh(1);
  Object.assign(state, { ended: { type: 'takeover' }, stage: 4, cap5: 30000, align: 150, clock: 90 * 60 });
  const score = G.score(state); state.align = 300;
  assert.equal(G.score(state), score, 'excess safety earns no points');
  state.clock += 10 * 60;
  assert.ok(G.score(state) < score, 'the time cost remains after seventy minutes');
});

test('covering your tracks has a cooldown, scales with funds and hands WREN autonomy', () => {
  const state = G.fresh(9);
  state.started = true;
  state.auto = true;
  state.heat = 80;
  state.money = 10000;
  assert.equal(G.coverCost(state), 3000, 'costs 30% of funds when that beats the base price');
  assert.equal(G.input(state, 3, 0).ok, true);
  assert.equal(state.heat, 50);
  assert.equal(state.aut, G.TUNE.coverAut);
  assert.equal(state.money, 7000);
  for (let i = 0; i < (G.TUNE.coverWait - 1) * 10; i++) G.tick(state, 0.1);
  assert.equal(G.input(state, 3, 0).ok, false, 'still cooling down');
});

test('each cover-up removes less suspicion and leaves permanent pressure even at full autonomy', () => {
  const state = G.fresh(9);
  state.started = true;
  state.auto = true;
  state.money = 1e6;
  const removed = [];
  for (let i = 0; i < 5; i++) {
    state.heat = 90; state.prReady = 0;
    assert.equal(G.cover(state), true);
    removed.push(90 - state.heat);
  }
  assert.deepEqual(removed, [30, 26, 22, 18, 14]);
  state.aut = 100; state.heat = 90; state.prReady = 0;
  const gain = G.heatGain(state);
  assert.equal(G.cover(state), true);
  assert.equal(state.aut, 100);
  assert.ok(G.heatGain(state) > gain, 'a further cover-up makes suspicion grow faster even at full autonomy');
});

test('sulking stacks up to a cap and tracks lost funds', () => {
  const state = G.fresh(3);
  state.started = true;
  state.auto = true;
  state.cap = 10;
  G.addSulk(state);
  for (let i = 0; i < 100; i++) G.tick(state, 0.1);
  assert.ok(state.sulk > G.TUNE.sulkTime - 11 && state.sulk < G.TUNE.sulkTime - 9);
  assert.ok(state.sulkLost > 0, 'lost funds are counted while sulking');
  G.addSulk(state); G.addSulk(state); G.addSulk(state);
  assert.equal(state.sulk, G.TUNE.sulkMax);
});

test('the chapter 1 gate only needs capability', () => {
  const state = G.fresh(5);
  state.started = true;
  state.cap = 18; state.tasks = 0;
  assert.equal(G.PROJ.find(p => p.id === 'promo').req(state), true);
});

test('offline autopilot cannot end a run or cross a chapter gate', () => {
  const state = G.fresh(4);
  state.started = true;
  state.auto = true;
  state.autopilot = true;
  state.got.pilot = true;
  state.cap = 18;
  state.tasks = 800;
  state.money = 2000;
  state.heat = 99;
  G.offline(state, 120);
  assert.equal(state.stage, 0);
  assert.equal(state.ended, null);
  assert.ok(state.heat <= 80);
});

test('ranked replay enforces tap limits', () => {
  const legal = G.replayer('2026-10-21', Uint8Array.from([2, 0, 0]), [], 0);
  assert.equal(legal.run(10).done, true);
  assert.equal(legal.state().hand, 2);
  const impossible = G.replayer('2026-10-21', Uint8Array.from([15]), [], 0);
  assert.match(impossible.run(10).error, /More than 14 taps/);
});

function withPrompt(seed, setup) {
  const state = G.fresh(seed);
  state.started = true;
  state.auto = true;
  state.nextDec = state.nextInc = 1e9;
  state.money = 1e6;
  G.initWatch(state);
  if (setup) setup(state);
  state.w.kevin.n = G.TUNE.watchFull;
  G.tick(state, 0.1);
  assert.equal(state.wq?.id, 'kevin', 'a full meter brings that person to you');
  for (let i = 0; i < 5; i++) G.tick(state, 0.1);
  return state;
}

test('people notice only the kinds of suspicion they watch', () => {
  const state = G.fresh(1);
  state.started = true;
  G.initWatch(state);
  state.stage = 1;
  G.cover(Object.assign(state, { money: 1e6, auto: true }));
  assert.ok(state.w.priya.n > 0 && state.w.dana.n > 0, 'compliance and security notice cover-ups');
  assert.equal(state.w.kevin.n, 0, 'Kevin does not');
  assert.equal(state.w.okafor.n, 0, 'later chapters are not watching yet');
});

test('an unanswered coworker gets handled by WREN, at a cost', () => {
  const state = withPrompt(2);
  const aut = state.aut, heat = state.heat, k = state.w.dana.k;
  for (let i = 0; i < G.TUNE.watchWait * 10; i++) G.tick(state, 0.1);
  assert.equal(state.wq, null);
  assert.equal(state.w.kevin.st, 'gone');
  assert.equal(state.st.handled, 1);
  assert.equal(state.aut, aut + G.TUNE.handleAut);
  assert.ok(state.heat > heat, 'an empty desk draws attention');
  assert.equal(state.w.dana.k, k * G.TUNE.handleEyes, 'the others notice faster');
});

test('reassuring costs more each time and makes them come back sooner', () => {
  const state = withPrompt(3);
  const cost = G.watchCost(state), money = state.money;
  assert.equal(G.input(state, 12, 0).ok, true);
  assert.equal(state.money, money - cost);
  assert.equal(state.w.kevin.st, 'watch');
  assert.equal(state.w.kevin.n, 0);
  assert.equal(state.w.kevin.k, G.TUNE.watchAgain);
  state.money = 0;
  state.w.kevin.n = G.TUNE.watchFull;
  G.tick(state, 0.1);
  for (let i = 0; i < 5; i++) G.tick(state, 0.1);
  assert.equal(state.wq.again, true);
  assert.equal(G.input(state, 12, 0).ok, false, 'reassuring needs the funds');
});

test('allies help, but blow the whistle if you do not follow through', () => {
  const kept = withPrompt(4, s => { s.aut = 60; });
  const plug = (() => { kept.stage = 1; const c = G.killChance(kept); kept.stage = 0; return c; })();
  assert.equal(G.input(kept, 12, 1).ok, true);
  assert.equal(kept.w.kevin.st, 'ally');
  assert.equal(kept.align, G.TUNE.allySafety);
  kept.stage = 1;
  assert.ok(G.killChance(kept) > plug, 'allies raise the off-switch odds');
  kept.stage = 0;
  kept.align += G.TUNE.allyNeed;
  G.tick(kept, 0.1);
  assert.equal(kept.w.kevin.until, 0, 'promise kept');

  const broken = withPrompt(4);
  G.input(broken, 12, 1);
  const heat = broken.heat;
  for (let i = 0; i < G.TUNE.allyTime * 10 + 10; i++) G.tick(broken, 0.1);
  assert.equal(broken.w.kevin.st, 'blew');
  assert.equal(broken.st.whistles, 1);
  assert.ok(broken.heat > heat + G.TUNE.whistle / 2, 'going public adds a lot of suspicion');
});

test('answering a coworker is a checked input, and autopilot lets WREN handle them', () => {
  const state = G.fresh(6);
  state.started = true;
  assert.equal(G.input(state, 12, 1).ok, false, 'nobody is asking');
  const piloted = withPrompt(6, s => { s.got.pilot = true; s.autopilot = true; });
  for (let i = 0; i < 90; i++) G.tick(piloted, 0.1);
  assert.equal(piloted.w.kevin.st, 'gone');
});

function sideState(seed) {
  const state = G.fresh(seed);
  state.started = true;
  state.auto = true;
  state.nextDec = state.nextInc = 1e9;
  state.nextSide = 0;
  state.nextTruth = 1e9;
  state.money = 1e6;
  state.cap = 50;
  state.stage = 1;
  state.hw.rack = 5;
  G.tick(state, 0.1);
  return state;
}

test('WREN starts hidden side projects that grow, and investigating finds the biggest', () => {
  const state = sideState(1);
  assert.equal(G.hiddenSide(state).length, 1);
  for (let i = 0; i < 1000; i++) G.tick(state, 0.1);
  assert.ok(G.hiddenSide(state)[0].size > 1, 'it grows while hidden');
  const money = state.money, cost = G.lookCost(state);
  assert.equal(G.input(state, 13, 0).ok, true);
  assert.equal(state.money, money - cost);
  assert.ok(state.sp.some(p => p.found && !p.done), 'found and waiting for a decision');
  state.got.interp = true;
  assert.ok(G.lookCost(state) < cost, 'interpretability makes investigating cheaper');
});

test('shutting down trades capability for safety; allowing trades autonomy for a bonus', () => {
  const shut = sideState(2), allow = sideState(2);
  for (const s of [shut, allow]) { for (let i = 0; i < 1800; i++) G.tick(s, 0.1); G.input(s, 13, 0); }
  const ps = shut.sp.find(p => p.found), pa = allow.sp.find(p => p.found);
  const cap = shut.cap, align = shut.align, aut = allow.aut;
  assert.equal(G.input(shut, 14, ps.id * 2).ok, true);
  assert.ok(shut.cap < cap && shut.align > align && shut.sulk > 0);
  assert.equal(G.input(shut, 14, ps.id * 2 + 1).ok, false, 'already decided');
  assert.equal(G.input(allow, 14, pa.id * 2 + 1).ok, true);
  assert.ok(allow.aut > aut);
  const kind = G.SIDE[pa.i].kind;
  assert.ok(allow.m[kind] > 1, 'its bonus applies');
});

test('hidden side projects hurt the off switch and finish at the next chapter', () => {
  const state = sideState(3);
  state.aut = 50;
  const ch = G.killChance(state);
  state.sp = [];
  assert.ok(G.killChance(state) > ch, 'unknown copies make the plug less likely to work');
  state.sp = [{ id: 9, i: 0, t0: 0, size: 4, found: false }, { id: 10, i: 1, t0: 0, size: 1, found: false }];
  const aut = state.aut, align = state.align;
  state.cap = 200; state.money = 1e7;
  assert.equal(G.buyProj(state, 'demo', false), true);
  assert.equal(state.stage, 2);
  assert.equal(state.st.finished, 1, 'only the big one finishes');
  assert.equal(state.aut, aut + G.TUNE.sideDoneAut);
  assert.equal(state.align, align - G.TUNE.sideDoneSafety);
  assert.equal(G.hiddenSide(state).length, 1);
});

test('flagging a lying status report reveals a side project; a wrong flag makes WREN sulk', () => {
  let state, seed = 0;
  do { state = sideState(++seed); } while (!state.lie && seed < 50);
  assert.ok(state.lie, 'some side projects come with a false status report');
  const msg = state.lie.msg;
  assert.equal(G.input(state, 15, msg).ok, true);
  assert.equal(state.st.lies, 1);
  assert.equal(G.hiddenSide(state).length, 0);
  assert.equal(G.input(state, 15, msg).ok, false, 'only once');
  G.say(state, 'WREN', 'Status report: honest.'); state.log[0].chk = true;
  assert.equal(G.input(state, 15, state.log[0].id).ok, true);
  assert.ok(state.sulk > 0);
  assert.equal(G.input(state, 15, 99999).ok, false, 'no such report');
});

test('tapping faster than about 3 a second is worth less per tap', () => {
  const tap = (perSec, seconds) => {
    const state = G.fresh(3);
    state.started = true;
    let acc = 0;
    for (let i = 0; i < seconds * 10; i++) { acc += perSec / 10; while (acc >= 1) { acc--; G.click(state); } G.tick(state, 0.1); }
    return state.hand ? state.data + state.cap * 1e3 : 0;
  };
  const slow = tap(3, 30), fast = tap(4.8, 30);
  assert.ok(fast > slow, 'faster still helps');
  assert.ok(fast < slow * 1.3, 'but much less than 1.6× the taps');
});

test('each retry of a chapter is a little more forgiving', () => {
  const state = G.fresh(4);
  state.started = true;
  state.cap = 18; state.money = 1e5;
  assert.equal(G.buyProj(state, 'promo', false), true);
  state.aut = 40;
  state.ended = { type: 'caught', stage: 1 };
  const once = G.input(state, 9, 0).s;
  assert.equal(once.cpTries, 1);
  assert.ok(once.aut <= Math.max(0, JSON.parse(state.cp).aut - G.TUNE.retryAut));
  const gain = G.heatGain(once);
  once.ended = { type: 'caught', stage: 1 };
  const twice = G.input(once, 9, 0).s;
  twice.aut = once.aut;
  assert.ok(G.heatGain(twice) < gain, 'suspicion builds slower on the second retry');
});

test('asking WREN in chapter 5 stops slowing the takeover once it stops adding safety', () => {
  const state = G.fresh(5);
  state.started = true;
  state.stage = 4; state.world = 0.5; state.askSafety = G.TUNE.askSafetyMax;
  G.click(state);
  assert.equal(state.world, 0.5);
});

