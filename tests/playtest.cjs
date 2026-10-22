// Quick smoke test for the simulated playtest (the full report is `node sim/playtest.cjs`).
// Every simulated player finishes a run without the rules throwing, numbers breaking, or the game refusing an action it offered.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadGame } = require('../sim/game.cjs');
const { make } = require('../sim/strategies.cjs');
const { play } = require('../sim/runner.cjs');
const { analyze } = require('../sim/analyze.cjs');

const G = loadGame();
const S = make(G);

test('every simulated player gets through a run without breaking the rules', () => {
  const runs = Object.values(S).map((P) => { const { sum, rec } = play(G, P, 1); return { label: P.label, blurb: P.blurb, sum, rec }; });
  const bugs = analyze(G, { runs }).findings.filter((f) => f.sev === 'bug');
  assert.deepEqual(bugs.map((b) => b.title + ': ' + b.detail + ' ' + b.evidence.join(' ')), []);
  for (const r of runs) assert.ok(r.sum.ending || r.sum.minutes >= 179, r.label + ' stopped early without an ending');
});

test('the simulated players reach the expected kinds of endings', () => {
  assert.equal(play(G, S.careful, 2).sum.ending, 'gardener');
  const attentiveRusher = { ...S.rusher, packet: { catch: 1, react: [0.4, 0.9] } };
  assert.ok([1, 2, 3, 4].some(seed => play(G, attentiveRusher, seed).sum.ending === 'optimizer'), 'rushing with attentive containment can still reach takeover');
  const shutdowns = [1, 2, 3, 4].map(seed => play(G, S.plugger, seed).sum);
  assert.ok(shutdowns.some(s => s.ending === 'plug3'), 'a prepared late shutdown remains reachable');
  assert.ok(shutdowns.every(s => s.kills > 0), 'the policy actually attempts shutdown');
  assert.match(play(G, S.reckless, 2).sum.ending, /^caught/);
});

