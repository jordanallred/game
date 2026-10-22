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

function play(seed, careful, pathSide = null) {
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
    if (careful && state.inc) {
      for (const packet of [...state.inc.pk]) {
        if (packet.id % 4 !== 0 && state.t - packet.born >= 1.4) G.input(state, 6, packet.id);
      }
    }
    if (state.dec && state.t - state.dec.t0 >= 0.6) G.input(state, careful ? 5 : 4, 0);
    if (state.heat > 58 && state.money >= G.coverCost(state)) G.input(state, 3, 0);
    if (step % 10 === 0) {
      if (pathSide !== null) {
        for (let tier = 0; tier < G.PATHS.length; tier++) {
          if (G.pathState(state, tier) === 'can') G.input(state, 10, tier * 2 + pathSide);
        }
      }
      for (const id of priorities) {
        const project = G.PROJ.find(p => p.id === id);
        if (project && (careful || !project.align) && G.projState(state, project) === 'can') G.buyProj(state, id, false);
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

test('reckless play reaches a worse ending despite faster progress', () => {
  for (const seed of [1, 2, 3]) {
    const result = play(seed, false);
    assert.equal(result.state.ended?.type, 'takeover');
    assert.equal(G.endingId(result.state), 'optimizer');
    assert.deepEqual(result.chapters, [0, 1, 2, 3, 4]);
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
  const fast = play(2, false, 0);
  const safe = play(2, true, 1);
  assert.equal(fast.state.ended?.type, 'takeover');
  assert.equal(safe.state.ended?.type, 'takeover');
  assert.deepEqual(Array.from(fast.state.path), [0, 0, 0, 0]);
  assert.deepEqual(Array.from(safe.state.path), [1, 1, 1, 1]);
  assert.ok(fast.state.st.covers > 0, 'fast route still needs suspicion management');
  assert.ok(safe.state.align > fast.state.align);
});
