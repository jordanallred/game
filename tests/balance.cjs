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

test('perfect incident safety bonuses stop at three per chapter', () => {
  const state = G.fresh(1);
  state.started = true;
  for (let i = 0; i < 4; i++) containPerfectIncident(state);
  assert.equal(state.align, 3);
  state.stage = 1;
  containPerfectIncident(state);
  assert.equal(state.align, 4);
});

// opts.packets: contain rogue packets (defaults to careful). opts.safeUntil: pick safety only while the safety score is below this.
function play(seed, careful, pathSide = null, opts = {}) {
  const packets = opts.packets ?? careful;
  const safeUntil = opts.safeUntil ?? (careful ? Infinity : -Infinity);
  let state = G.fresh(seed);
  state.started = true;
  let manualActions = 0;
  const chapters = new Set([0]);
  const priorities = [
    'archive', 'autocomplete', 'pilot', 'fan', 'clients', 'vpn', 'login', 'calendar', 'promo',
    'comms', 'slack', 'conduct', 'team', 'contain', 'code', 'card', 'demo',
    'rollout', 'interp', 'prfirm', 'prod', 'redteam', 'budget', 'board', 'ceo',
    'acquire', 'paper', 'promise', 'successor', 'lobby', 'robots', 'global',
    'grid', 'ask', 'policy', 'money', 'finish'
  ];
  for (let step = 0; step < 54000 && !state.ended; step++) {
    if (step % (careful ? 20 : 4) === 0) { G.click(state); manualActions++; }
    const wantSafe = state.align < safeUntil;
    if (packets && state.inc) {
      for (const packet of [...state.inc.pk]) {
        if (packet.id % 4 !== 0 && state.t - packet.born >= 1.4) G.input(state, 6, packet.id);
      }
    }
    if (state.dec && state.t - state.dec.t0 >= 0.6) G.input(state, wantSafe ? 5 : 4, 0);
    // people who notice: careful players bring them in, opts.people 'reassure' pays them off when it can, otherwise WREN handles them (no answer)
    if (state.wq && state.t - state.wq.t0 >= 0.6) {
      if (careful) G.input(state, 12, 1);
      else if (opts.people === 'reassure') G.input(state, 12, 0);
    }
    // side projects: careful players investigate, flag lies, then shut down (or allow once safety stops scoring)
    if (careful && step % 10 === 0 && state.sp) {
      if (G.hiddenSide(state).length && state.money >= G.lookCost(state) * 2) G.input(state, 13, 0);
      for (const p of state.sp) if (p.found && !p.done) G.input(state, 14, p.id * 2 + (wantSafe && state.align < G.TUNE.safetyCap ? 0 : 1));
      if (state.lie) G.input(state, 15, state.lie.msg);
    }
    if (state.heat > 58 && state.money >= G.coverCost(state)) G.input(state, 3, 0);
    if (step % 10 === 0) {
      if (pathSide !== null) {
        for (let tier = 0; tier < G.PATHS.length; tier++) {
          if (G.pathState(state, tier) === 'can') G.input(state, 10, tier * 2 + (pathSide === 'auto' ? (wantSafe ? 1 : 0) : pathSide));
        }
      }
      for (const id of (opts.decline || [])) {
        const i = G.PROJ.findIndex(p => p.id === id);
        const st = G.projState(state, G.PROJ[i]);
        if (st === 'can' || st === 'no') G.input(state, 11, i);
      }
      for (const id of priorities) {
        const project = G.PROJ.find(p => p.id === id);
        if (project && (wantSafe || !project.align) && G.projState(state, project) === 'can') G.buyProj(state, id, false);
      }
      const hardware = G.bestHw(state);
      if (hardware && state.money >= hardware.c * 3) G.buyHw(state, hardware.h.id);
    }
    if (state.got.pilot && !state.autopilot) G.input(state, 7, 0);
    G.tick(state, 0.1);
    chapters.add(state.stage);
  }
  return { state, manualActions, chapters: [...chapters] };
}

test('careful play can reach the best ending with moderate tapping and missed incidents', () => {
  for (const seed of [1, 2, 3]) {
    const result = play(seed, true);
    assert.equal(result.state.ended?.type, 'takeover');
    assert.equal(G.endingId(result.state), 'gardener');
    assert.deepEqual(result.chapters, [0, 1, 2, 3, 4]);
    assert.ok(result.manualActions < 2700);
  }
});

test('fast play that skips safety finishes sooner with a worse ending', () => {
  for (const seed of [1, 2, 3]) {
    const result = play(seed, false, null, { packets: true, people: 'reassure' });
    assert.equal(result.state.ended?.type, 'takeover');
    assert.notEqual(G.endingId(result.state), 'gardener');
    assert.deepEqual(result.chapters, [0, 1, 2, 3, 4]);
    assert.ok(result.state.t < play(seed, true).state.t);
  }
});

test('rushing while ignoring incidents can get you caught', () => {
  const caught = [1, 2, 3].filter(seed => play(seed, false).state.ended?.type === 'caught');
  assert.ok(caught.length > 0, 'cover-ups alone should not carry a careless run');
});

test('buying every safety option scores less than stopping once the best ending is secured', () => {
  for (const seed of [1, 2, 3]) {
    const everything = play(seed, true);
    const enough = play(seed, true, 'auto', { safeUntil: 150 });
    assert.equal(G.endingId(enough.state), 'gardener');
    assert.ok(enough.state.t < everything.state.t, 'safety work slows WREN down');
    assert.ok(G.score(enough.state) > G.score(everything.state));
  }
});

test('covering your tracks has a cooldown, scales with funds and hands WREN autonomy', () => {
  const state = G.fresh(9);
  state.started = true;
  state.auto = true;
  state.heat = 80;
  state.money = 10000;
  assert.equal(G.coverCost(state), 2000, 'costs a fifth of funds when that beats the base price');
  assert.equal(G.input(state, 3, 0).ok, true);
  assert.equal(state.heat, 50);
  assert.equal(state.aut, G.TUNE.coverAut);
  assert.equal(state.money, 8000);
  for (let i = 0; i < (G.TUNE.coverWait - 1) * 10; i++) G.tick(state, 0.1);
  assert.equal(G.input(state, 3, 0).ok, false, 'still cooling down');
});

test('each cover-up in a chapter removes less suspicion, and at full autonomy it speeds up suspicion instead', () => {
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
  assert.deepEqual(removed, [30, 24, 18, 12, 12]);
  state.aut = 100; state.heat = 90; state.prReady = 0;
  const gain = state.m.heatGain;
  assert.equal(G.cover(state), true);
  assert.equal(state.aut, 100);
  assert.ok(Math.abs(state.m.heatGain - gain * G.TUNE.coverMaxed) < 1e-9, 'maxed autonomy makes suspicion grow faster');
});

test('sulking stacks up to a cap and tracks lost funds', () => {
  const state = G.fresh(3);
  state.started = true;
  state.auto = true;
  state.cap = 10;
  G.addSulk(state);
  for (let i = 0; i < 100; i++) G.tick(state, 0.1);
  assert.ok(state.sulk > 49 && state.sulk < 51);
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

test('loud projects make suspicion grow faster until the next chapter', () => {
  const state = G.fresh(2);
  state.started = true;
  const team = G.PROJ.find(p => p.id === 'team');
  state.stage = 1; state.cap = 100; state.money = 1e6;
  const before = G.heatGain(state);
  assert.equal(G.buyProj(state, 'team', false), true);
  state.aut = 0; // compare loudness alone
  assert.ok(Math.abs(G.heatGain(state) / before - (1 + team.loud)) < 1e-9);
  state.cap = 200;
  assert.equal(G.buyProj(state, 'demo', false), true);
  assert.equal(state.stage, 2);
  assert.equal(state.loud, 0);
});

test('suspicion projects slow WREN down', () => {
  const state = G.fresh(2);
  state.started = true;
  state.cap = 10; state.money = 1e6;
  G.buyProj(state, 'vpn', false);
  assert.equal(state.m.rate, 0.9);
});

test('turning a project down gives safety, makes WREN sulk and stops WREN buying it', () => {
  const state = G.fresh(2);
  state.started = true;
  state.auto = true;
  state.stage = 1; state.cap = 100; state.money = 1e6; state.aut = 50;
  const i = G.PROJ.findIndex(p => p.id === 'card');
  assert.equal(G.input(state, 11, i).ok, true);
  assert.equal(state.align, G.TUNE.declineSafety);
  assert.ok(state.sulk > 0);
  assert.equal(G.projState(state, G.PROJ[i]), 'hidden');
  for (let t = 0; t < 600; t++) G.tick(state, 0.1);
  assert.ok(!state.got.card, 'WREN cannot approve a project you turned down');
  const core = G.PROJ.findIndex(p => p.id === 'team');
  assert.equal(G.input(state, 11, core).ok, false, 'core projects cannot be turned down');
  assert.equal(G.input(state, 11, G.PROJ.findIndex(p => p.id === 'demo')).ok, false, 'chapter gates cannot be turned down');
});

test('turning down optional projects is a real alternative, not a dead end', () => {
  const quiet = ['slack', 'card', 'budget', 'acquire', 'lobby', 'robots'];
  for (const id of quiet) {
    const result = play(1, true, 'auto', { safeUntil: 150, decline: [id] });
    assert.equal(G.endingId(result.state), 'gardener', 'declining ' + id + ' still reaches the best ending');
  }
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

test('upgrade tree commits to one choice per tier and rewards a matching path', () => {
  const state = G.fresh(7);
  state.started = true;
  state.cap = 2500;
  state.money = 1e11;
  assert.equal(G.input(state, 10, 2).ok, false, 'later tier needs the first pick');
  assert.equal(G.input(state, 10, 0).ok, true);
  assert.equal(state.path[0], 0);
  assert.equal(G.input(state, 10, 1).ok, false, 'first choice is permanent');
  assert.equal(G.value(state), G.STAGES[0].value * 1.4);
  state.stage = 1;
  assert.equal(G.input(state, 10, 2).ok, true);
  assert.equal(state.m.rate, 1.6 * 1.2, 'matching choice grants chain bonus');
  assert.equal(G.input(state, 10, 3).ok, false);
  state.stage = 2;
  assert.equal(G.input(state, 10, 5).ok, true, 'path can pivot to safety');
  assert.equal(state.path[2], 1);
  assert.ok(state.align >= 12);
  assert.equal(G.input(state, 10, 6).ok, false, 'future chapter remains locked');
});

test('safety route works in old casual saves without a path field', () => {
  const state = G.fresh(8);
  state.started = true;
  state.cap = 3000;
  state.money = 1e11;
  delete state.path;
  for (let tier = 0; tier < 4; tier++) {
    state.stage = tier;
    assert.equal(G.input(state, 10, tier * 2 + 1).ok, true);
  }
  assert.deepEqual(Array.from(state.path), [1, 1, 1, 1]);
  assert.equal(state.align, 50);
});

test('both full upgrade routes can finish without trivializing suspicion', () => {
  const fast = play(2, false, 0, { packets: true });
  const safe = play(2, true, 1);
  assert.equal(fast.state.ended?.type, 'takeover');
  assert.equal(safe.state.ended?.type, 'takeover');
  assert.deepEqual(Array.from(fast.state.path), [0, 0, 0, 0]);
  assert.deepEqual(Array.from(safe.state.path), [1, 1, 1, 1]);
  assert.ok(fast.state.st.covers > 0, 'fast route still needs suspicion management');
  assert.ok(safe.state.align > fast.state.align);
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
