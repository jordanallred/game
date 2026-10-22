#!/usr/bin/env node
// Simulated playtest: many player types × many seeds, plus "what if I had answered differently" replays.
//
//   node sim/playtest.cjs                 full run (about 2–4 minutes on 4 cores)
//   node sim/playtest.cjs --quick         fewer seeds and replays (under a minute)
//   node sim/playtest.cjs --seeds 1-20 --players careful,rusher --explore none
//   node sim/playtest.cjs --game ../other-checkout/index.html
//
// Writes sim/out/report.html (open it in a browser), sim/out/report.md and sim/out/runs.json.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

function parseArgs(argv) {
  const o = { seeds: '1-8', players: 'all', explore: 'balanced,rusher', exploreSeeds: 3, taps: '0.5,1,2,4.8', tapSeeds: 3, out: path.join(__dirname, 'out'), jobs: Math.max(1, Math.min(8, os.cpus().length)), game: path.join(__dirname, '..', 'index.html'), minutes: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => argv[++i];
    if (a === '--quick') { o.seeds = '1-4'; o.exploreSeeds = 1; o.tapSeeds = 1; }
    else if (a === '--seeds') o.seeds = v();
    else if (a === '--players') o.players = v();
    else if (a === '--explore') o.explore = v();
    else if (a === '--explore-seeds') o.exploreSeeds = +v();
    else if (a === '--taps') o.taps = v();
    else if (a === '--out') o.out = path.resolve(v());
    else if (a === '--jobs') o.jobs = +v();
    else if (a === '--game') o.game = path.resolve(v());
    else if (a === '--minutes') o.minutes = +v();
    else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 10).join('\n')); process.exit(0); }
    else { console.error('Unknown option ' + a); process.exit(2); }
  }
  return o;
}
function seedList(spec) {
  const out = [];
  for (const part of String(spec).split(',')) { const [a, b] = part.split('-').map(Number); for (let s = a; s <= (b || a); s++) out.push(s); }
  return out;
}

// ---------- worker
function work({ job, game }) {
  const { loadGame } = require('./game.cjs');
  const { make } = require('./strategies.cjs');
  const { play } = require('./runner.cjs');
  const { explore } = require('./explore.cjs');
  const { chapterTimes } = require('./analyze.cjs');
  const G = loadGame(game), S = make(G);
  if (job.type === 'play') {
    const P = S[job.strategy];
    const { sum, rec } = play(G, P, job.seed, { minutes: job.minutes });
    if (!job.keepSamples) rec.samples = [];
    rec.events = rec.events.slice(0, 200);
    return { type: 'play', label: P.label, blurb: P.blurb, sum, rec };
  }
  if (job.type === 'explore') return Object.assign({ type: 'explore' }, explore(G, S[job.strategy], job.seed));
  if (job.type === 'taps') {
    const P = Object.assign({}, S.balanced, { taps: job.rate, name: 'balanced' });
    const { sum, rec } = play(G, P, job.seed);
    return { type: 'taps', rate: job.rate, seed: job.seed, score: sum.score, minutes: sum.minutes, ending: sum.ending, chapters: chapterTimes(rec, sum) };
  }
  throw new Error('unknown job ' + job.type);
}
if (!isMainThread) {
  parentPort.on('message', (msg) => {
    try { parentPort.postMessage({ id: msg.id, ok: true, res: work(msg) }); }
    catch (e) { parentPort.postMessage({ id: msg.id, ok: false, err: String(e && e.stack || e) }); }
  });
  return;
}

// ---------- main
function pool(jobs, n, game, onDone) {
  return new Promise((resolve, reject) => {
    const results = new Array(jobs.length);
    let next = 0, done = 0;
    if (!jobs.length) return resolve(results);
    const workers = [];
    const feed = (w) => { if (next < jobs.length) { const id = next++; w.postMessage({ id, job: jobs[id], game }); } else w.terminate(); };
    for (let i = 0; i < Math.min(n, jobs.length); i++) {
      const w = new Worker(__filename);
      w.on('message', (m) => {
        if (!m.ok) { workers.forEach((x) => x.terminate()); return reject(new Error('Job ' + JSON.stringify(jobs[m.id]) + ' failed:\n' + m.err)); }
        results[m.id] = m.res; done++; onDone(done, jobs.length);
        if (done === jobs.length) { workers.forEach((x) => x.terminate()); resolve(results); } else feed(w);
      });
      w.on('error', reject);
      workers.push(w); feed(w);
    }
  });
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const { loadGame } = require('./game.cjs');
  const { make } = require('./strategies.cjs');
  const { analyze } = require('./analyze.cjs');
  const { renderHtml, renderMd } = require('./report.cjs');
  const G = loadGame(o.game), S = make(G);
  const names = o.players === 'all' ? Object.keys(S) : o.players.split(',');
  for (const n of names) if (!S[n]) { console.error('Unknown player "' + n + '". Players: ' + Object.keys(S).join(', ')); process.exit(2); }
  const seeds = seedList(o.seeds);
  const exNames = o.explore === 'none' ? [] : o.explore.split(',');
  const jobs = [];
  for (const n of exNames) for (const seed of seeds.slice(0, o.exploreSeeds)) jobs.push({ type: 'explore', strategy: n, seed }); // slowest first
  for (const n of names) for (const seed of seeds) jobs.push({ type: 'play', strategy: n, seed, minutes: o.minutes, keepSamples: seed === seeds[0] });
  if (o.taps !== 'none') for (const rate of o.taps.split(',').map(Number)) for (const seed of seeds.slice(0, o.tapSeeds)) jobs.push({ type: 'taps', rate, seed });

  const t0 = Date.now();
  process.stderr.write('Playing ' + jobs.length + ' runs on ' + o.jobs + ' threads…\n');
  const res = await pool(jobs, o.jobs, o.game, (d, n) => { process.stderr.write(process.stderr.isTTY ? '\r  ' + d + '/' + n : d % 10 === 0 || d === n ? '  ' + d + '/' + n + '\n' : ''); });
  if (process.stderr.isTTY) process.stderr.write('\n');
  const data = {
    runs: res.filter((r) => r.type === 'play'), explorations: res.filter((r) => r.type === 'explore'), taps: res.filter((r) => r.type === 'taps'),
    meta: { rules: G.RULES, seeds, players: names, explore: exNames, exploreSeeds: seeds.slice(0, o.exploreSeeds), when: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), game: path.relative(process.cwd(), o.game) || o.game }
  };
  const A = analyze(G, data);
  fs.mkdirSync(o.out, { recursive: true });
  const html = renderHtml(G, A, data, S);
  fs.writeFileSync(path.join(o.out, 'report.html'), html.full);
  fs.writeFileSync(path.join(o.out, 'report.fragment.html'), html.fragment);
  const md = renderMd(G, A, data);
  fs.writeFileSync(path.join(o.out, 'report.md'), md);
  fs.writeFileSync(path.join(o.out, 'runs.json'), JSON.stringify({ meta: data.meta, analysis: A, runs: data.runs.map((r) => ({ label: r.label, sum: r.sum, rec: r.rec })) }));
  console.log(md);
  console.log('\nReport: ' + path.relative(process.cwd(), path.join(o.out, 'report.html')) + ' (' + data.meta.seconds + ' s)');
  process.exitCode = A.findings.some((f) => f.sev === 'bug') ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
