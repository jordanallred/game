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
  assert.equal(play(G, S.rusher, 2).sum.ending, 'optimizer');
  assert.equal(play(G, S.plugger, 2).sum.ending, 'plug3');
  assert.match(play(G, S.reckless, 2).sum.ending, /^caught/);
});
