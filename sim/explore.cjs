// Counterfactuals: at every choice the player makes (decisions, coworkers, upgrade paths, turning projects down),
// copy the run, force each other answer, play the copy to the end with the same player, and compare.
const { createRun, fork, finish, summary } = require('./runner.cjs');

function explore(G, strategy, seed, opts = {}) {
  const points = [];
  const maxPoints = opts.maxPoints || 80;
  const base = createRun(G, strategy, seed, {
    light: true, setup: opts.setup,
    onChoice(run, c) {
      if (points.length >= maxPoints) return undefined;
      // every answer, the player's own included, gets the same treatment: copy now, answer on the copy's next tick
      const branches = {};
      for (const o of c.options) {
        const b = fork(run);
        reopen(b, c);
        b.opts.onChoice = (r, c2) => (c2.kind === c.kind && c2.key === c.key && r === b && !b.forcedDone ? (b.forcedDone = true, o) : undefined);
        b.forcedDone = false;
        finish(b);
        branches[String(o)] = result(G, b);
      }
      points.push({ kind: c.kind, key: c.key, pick: c.pick === null || c.pick === undefined ? null : String(c.pick), stage: run.s.stage, t: +run.s.clock.toFixed(1), branches });
      return undefined;
    }
  });
  finish(base);
  const baseRes = result(G, base);
  return { strategy: strategy.name, seed, base: baseRes, points };
}

// The choice was taken mid-tick; let the copy see it again on its next tick.
function reopen(b, c) {
  if (c.kind === 'decision') b.bot.dec.done = false;
  else if (c.kind === 'coworker') b.bot.wq.done = false;
  else if (c.kind === 'rival') b.bot.rv.done = false;
  else if (c.kind === 'route') delete b.bot.offered['route:' + c.key];
  else { b.bot.nextLook = 0; if (c.kind === 'project') delete b.bot.offered[c.key]; }
}

function result(G, run) { const s = summary(run); return { score: s.score, ending: s.ending, minutes: s.minutes, align: +s.align.toFixed(1) }; }

module.exports = { explore };
