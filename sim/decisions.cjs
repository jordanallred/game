// Decision probe: does each decision actually change the score?
//
// The playtest explorer only replays the decisions that happen to come up, so a decision can look flat
// (or decisive) from two or three samples. This probe puts every decision in front of every player
// instead: each run is paused at its first decision of each chapter, and for every decision of that
// chapter the run is copied twice, answered "a" and "b", and played to the end.
//
//   node sim/decisions.cjs                       # careful, balanced, casual, rusher × seeds 1–8
//   node sim/decisions.cjs --seeds 1-8 --players balanced,rusher --only 40,41
//
// A decision is flat for a player when every replayed pair lands within 2% of each other.
// Gains are "a" compared with "b" (positive: WREN's answer scored more).
const { Worker, isMainThread, parentPort } = require('node:worker_threads');
const path = require('node:path');
const os = require('node:os');

const NOISE = 0.02;
const MANDATE_ORDER = ['standard', 'operations', 'research', 'oversight'];

function work({ strategy, seed, only, game }) {
  const { loadGame } = require('./game.cjs');
  const { make } = require('./strategies.cjs');
  const { createRun, fork, finish, summary } = require('./runner.cjs');
  const G = loadGame(game), S = make(G);
  const probed = {}, out = [];
  const setup = { mandate: MANDATE_ORDER[(seed - 1) % MANDATE_ORDER.length], complication: 'none' };
  const base = createRun(G, S[strategy], seed, {
    light: true, setup,
    onChoice(run, c) {
      if (c.kind !== 'decision' || probed[run.s.stage]) return undefined;
      probed[run.s.stage] = true;
      G.DEC.forEach((d, i) => {
        if (d.stage !== run.s.stage || (only && !only.includes(i)) || run.s.decUsed[i]) return;
        const res = {};
        for (const o of ['a', 'b']) {
          const b = fork(run);
          b.s.dec.i = i; b.bot.dec.done = false; b.forced = false;
          b.opts.onChoice = (r, c2) => (c2.kind === 'decision' && !b.forced ? (b.forced = true, o) : undefined);
          finish(b);
          const sm = summary(b);
          res[o] = { score: sm.score, ending: sm.ending, minutes: sm.minutes };
        }
        out.push({ i, strategy, seed, a: res.a, b: res.b });
      });
      return undefined;
    }
  });
  finish(base);
  return out;
}

if (!isMainThread) {
  parentPort.on('message', (m) => { try { parentPort.postMessage({ ok: true, res: work(m) }); } catch (e) { parentPort.postMessage({ ok: false, err: String(e && e.stack || e) }); } });
  return;
}

function range(spec) { const out = []; for (const part of String(spec).split(',')) { const [a, b] = part.split('-').map(Number); for (let s = a; s <= (b || a); s++) out.push(s); } return out; }

async function main() {
  const args = process.argv.slice(2), o = { seeds: '1-8', players: 'careful,balanced,casual,rusher', only: null, game: path.join(__dirname, '..', 'index.html'), jobs: Math.max(1, Math.min(8, os.cpus().length)), json: null };
  for (let k = 0; k < args.length; k++) {
    const v = () => args[++k];
    if (args[k] === '--seeds') o.seeds = v(); else if (args[k] === '--players') o.players = v(); else if (args[k] === '--only') o.only = range(v());
    else if (args[k] === '--game') o.game = path.resolve(v()); else if (args[k] === '--jobs') o.jobs = +v(); else if (args[k] === '--json') o.json = v();
  }
  const { loadGame } = require('./game.cjs');
  const G = loadGame(o.game);
  const jobs = [];
  for (const strategy of o.players.split(',')) for (const seed of range(o.seeds)) jobs.push({ strategy, seed, only: o.only, game: o.game });
  const t0 = Date.now();
  const results = [];
  await new Promise((resolve, reject) => {
    let next = 0, done = 0;
    const workers = [];
    const feed = (w) => { if (next < jobs.length) w.postMessage(jobs[next++]); else w.terminate(); };
    for (let n = 0; n < Math.min(o.jobs, jobs.length); n++) {
      const w = new Worker(__filename);
      w.on('message', (m) => {
        if (!m.ok) return reject(new Error(m.err));
        results.push(...m.res); done++;
        process.stderr.write('\r  ' + done + '/' + jobs.length);
        if (done === jobs.length) { workers.forEach((x) => x.terminate()); resolve(); } else feed(w);
      });
      w.on('error', reject);
      workers.push(w); feed(w);
    }
  });
  process.stderr.write('\n');
  if (o.json) require('node:fs').writeFileSync(o.json, JSON.stringify(results));

  const players = o.players.split(',');
  const rows = [];
  G.DEC.forEach((d, i) => {
    if (o.only && !o.only.includes(i)) return;
    const cells = players.map((p) => {
      const rs = results.filter((r) => r.i === i && r.strategy === p && (r.a.score || r.b.score));
      if (!rs.length) return { p, n: 0 };
      const gains = rs.map((r) => r.a.score / Math.max(1, r.b.score) - 1);
      const flat = gains.filter((g) => Math.abs(g) < NOISE).length;
      const aWins = gains.filter((g) => g >= NOISE).length, bWins = gains.filter((g) => g <= -NOISE).length;
      return { p, n: rs.length, mean: gains.reduce((x, y) => x + y, 0) / gains.length, flat, aWins, bWins };
    });
    const seen = cells.filter((c) => c.n);
    const flat = seen.length > 0 && seen.every((c) => c.flat === c.n);
    const always = seen.length > 1 && (seen.every((c) => c.aWins === c.n) ? 'a' : seen.every((c) => c.bWins === c.n) ? 'b' : null);
    rows.push({ i, d, cells, flat, always });
  });
  const pct = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';
  console.log('Decision probe, rules ' + G.RULES + ', seeds ' + o.seeds + ' (' + Math.round((Date.now() - t0) / 1000) + ' s). Cells: mean score of "a" vs "b", then a-wins/b-wins/flat.\n');
  console.log(['#', 'ch', 'decision', ...players].join(' | '));
  for (const r of rows) console.log([r.i, r.d.stage + 1, (r.flat ? 'FLAT ' : r.always ? 'ALWAYS-' + r.always.toUpperCase() + ' ' : '') + r.d.q.replace(/\s+/g, ' ').slice(0, 60), ...r.cells.map((c) => c.n ? pct(c.mean) + ' ' + c.aWins + '/' + c.bWins + '/' + c.flat : '-')].join(' | '));
  const flats = rows.filter((r) => r.flat), always = rows.filter((r) => r.always);
  console.log('\n' + flats.length + ' of ' + rows.length + ' decisions never changed the score: ' + (flats.map((r) => r.i).join(', ') || 'none'));
  console.log(always.length + ' had one answer that won for every player and seed: ' + (always.map((r) => r.i + r.always).join(', ') || 'none'));
}
main().catch((e) => { console.error(e); process.exit(1); });
