const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('../sim/game.cjs');
const G = loadGame();

test('ordinary early work builds a backlog that a hardware purchase can clear faster', () => {
  const s = G.fresh(1); s.started = true; s.auto = true; s.cap = 4;
  s.hw.gpu = 3;
  assert.ok(G.dataIn(s) > G.trainRate(s), 'data supply must exceed a small early hardware allocation');
  for (let i = 0; i < 100; i++) G.tick(s, G.STEP);
  assert.ok(s.data > 0.1);
  const a = JSON.parse(JSON.stringify(s)), b = JSON.parse(JSON.stringify(s));
  b.hw.gpu++;
  for (let i = 0; i < 100; i++) { G.tick(a, G.STEP); G.tick(b, G.STEP); }
  assert.ok(b.cap > a.cap, 'more hardware must actually improve capability');
  b.hw.gpu = 100;
  assert.ok(G.dataIn(b) < G.trainRate(b), 'overbuying hardware must shift the bottleneck back to data');
});

test('training forecasts distinguish idle capacity, buffered data and recent manual work', () => {
  const s = G.fresh(2); s.started = true;
  assert.equal(G.trainingStats(s).used, 0);
  assert.equal(G.trainingStats(s, 1).gain, 0);
  s.data = 1000;
  assert.ok(G.trainingStats(s, 1).gain > 0);
  assert.equal(G.trainingStats(s).utilization, 1);
  s.data = 0; G.click(s);
  assert.ok(G.trainingStats(s).incoming > 0);
  s.t += 60;
  assert.ok(G.trainingStats(s).incoming < 0.001);
});
