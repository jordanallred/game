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

function play(seed, careful) {
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
