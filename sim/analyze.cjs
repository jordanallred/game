// Turns raw runs into findings: things that look broken, unused, too strong, or stuck.
// Every check reads the game's own tables (PROJ, DEC, WATCHERS, SKILLS, HW, ENDINGS), so new content is checked automatically.

const ACTIVE = ['careful', 'balanced', 'casual', 'quiet', 'rusher', 'plugger']; // players who read and think
const LOW_EFFORT = ['masher', 'idle', 'away'];
const NOISE = 0.02; // score differences under 2% are within run-to-run noise (timing jitter alone moves scores ~1%)

const median = (xs) => { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (x) => Math.round(x * 100) + '%';
const min1 = (sec) => (sec / 60).toFixed(1);

function chapterTimes(rec, sum) {
  const out = [null, null, null, null, null], ch = rec.chapters;
  for (let i = 0; i < ch.length; i++) {
    const end = i + 1 < ch.length ? ch[i + 1].t : sum.ending ? sum.minutes * 60 : null;
    if (end !== null) out[ch[i].stage] = (out[ch[i].stage] || 0) + (end - ch[i].t);
  }
  return out;
}

function analyze(G, data) {
  const { runs, explorations = [], taps = [], meta = {} } = data;
  const findings = [];
  const add = (sev, area, title, detail, evidence) => findings.push({ sev, area, title, detail, evidence: evidence || [] });
  const strategies = [...new Set(runs.map((r) => r.sum.strategy))];
  const by = (name) => runs.filter((r) => r.sum.strategy === name);

  // ---- per strategy summary
  const table = strategies.map((name) => {
    const rs = by(name);
    const scores = rs.map((r) => r.sum.score);
    const endings = {};
    rs.forEach((r) => { const e = r.sum.ending || 'unfinished'; endings[e] = (endings[e] || 0) + 1; });
    const ch = [0, 1, 2, 3, 4].map((i) => median(rs.map((r) => chapterTimes(r.rec, r.sum)[i]).filter((x) => x !== null)));
    return {
      name, label: rs[0].label, blurb: rs[0].blurb, n: rs.length,
      score: { min: Math.min(...scores), med: median(scores), max: Math.max(...scores), mean: mean(scores) },
      minutes: median(rs.map((r) => r.sum.minutes)), endings, chapters: ch,
      caught: rs.filter((r) => r.rec.caught.length).length, retries: mean(rs.map((r) => r.rec.retries)),
      unfinished: rs.filter((r) => !r.sum.ending).length,
      sulk: mean(rs.map((r) => r.rec.time.sulk / Math.max(1, r.sum.minutes * 60))),
      align: median(rs.map((r) => r.sum.align)),
      runs: rs.map((r) => ({ seed: r.sum.seed, score: r.sum.score, ending: r.sum.ending, minutes: r.sum.minutes, retries: r.rec.retries, chapters: chapterTimes(r.rec, r.sum) }))
    };
  });

  // ---- 1. crashes, broken numbers, refused inputs
  runs.forEach((r) => {
    const tag = r.sum.strategy + ' seed ' + r.sum.seed;
    const kinds = {};
    r.rec.problems.forEach((p) => { (kinds[p.kind] = kinds[p.kind] || []).push(p); });
    for (const k of Object.keys(kinds)) {
      const p = kinds[k][0];
      add('bug', 'Rules', k === 'crash' ? 'The rules threw an error' : 'A number went out of range (' + k + ')', p.text, [tag + ', chapter ' + (p.stage + 1) + ' at ' + min1(p.t) + ' min' + (kinds[k].length > 1 ? ' (+' + (kinds[k].length - 1) + ' more)' : '')]);
    }
    if (r.rec.refused.length) {
      const f = r.rec.refused[0];
      add('bug', 'Rules', 'The game refused an action it showed as available', '"' + f.what + '" was offered (state said it was possible) but input() said no.', [tag + ' at ' + min1(f.t) + ' min' + (r.rec.refused.length > 1 ? ' (+' + (r.rec.refused.length - 1) + ' more)' : '')]);
    }
  });

  // ---- 2. content coverage
  const bought = {}, boughtActive = {}, decSeen = {}, visits = {}, hwBought = {}, pathSide = {}, endingsSeen = {};
  runs.forEach((r) => {
    Object.keys(r.rec.buys).forEach((id) => { bought[id] = (bought[id] || 0) + 1; if (r.sum.strategy !== 'chaos') boughtActive[id] = 1; });
    r.rec.decisions.forEach((d) => { decSeen[d.i] = (decSeen[d.i] || 0) + 1; });
    r.rec.coworkers.forEach((c) => { visits[c.id] = (visits[c.id] || 0) + 1; });
    Object.entries(r.sum.hw).forEach(([k, v]) => { if (v > 0) hwBought[k] = 1; });
    r.sum.skills.forEach(i => { pathSide[i] = 1; });
    if (r.sum.ending) endingsSeen[r.sum.ending] = (endingsSeen[r.sum.ending] || 0) + 1;
  });
  const neverBought = G.PROJ.filter((p) => !boughtActive[p.id]);
  if (neverBought.length) add('warn', 'Content', neverBought.length + ' project' + (neverBought.length > 1 ? 's were' : ' was') + ' never bought', 'No simulated player bought: ' + neverBought.map((p) => '"' + p.name + '"').join(', ') + '. Either nobody reaches them or nobody wants them.', []);
  const neverDec = G.DEC.map((d, i) => i).filter((i) => !decSeen[i]);
  if (neverDec.length) add('note', 'Content', neverDec.length + ' of ' + G.DEC.length + ' decisions never came up', 'Each run sees only some decisions per chapter, so a few may simply be unlucky. Unseen: ' + neverDec.map((i) => 'ch.' + (G.DEC[i].stage + 1) + ' "' + G.DEC[i].q.slice(0, 60) + '…"').join('; '), []);
  const neverVisit = G.WATCHERS.filter((w) => !visits[w.id]);
  if (neverVisit.length) add('warn', 'People who notice', neverVisit.map((w) => w.name).join(', ') + ' never came to the desk', 'Their meter never filled in any run. Check what they watch: ' + neverVisit.map((w) => w.name + ' watches ' + Object.keys(w.eyes).join('/') + ' in chapters ' + (w.from + 1) + '–' + (w.to + 1)).join('; ') + '.', []);
  const neverHw = G.HW.filter((h) => !hwBought[h.id]);
  if (neverHw.length) add('warn', 'Content', 'Hardware never bought: ' + neverHw.map((h) => h.name).join(', '), 'No run bought it.', []);
  const neverPath = [];
  G.SKILLS.forEach((p,i)=>{if(!pathSide[i])neverPath.push(p.name);});
  if (neverPath.length) add('note', 'Content', 'Upgrade options never picked', neverPath.join(', '), []);
  const neverEnd = Object.keys(G.ENDINGS).filter((e) => !endingsSeen[e]);
  if (neverEnd.length) add('note', 'Endings', neverEnd.length + ' of ' + Object.keys(G.ENDINGS).length + ' endings never reached', neverEnd.map((e) => G.ENDINGS[e].name + ' (' + e + ')').join(', ') + '. These need a strategy that aims for them (or are just rare).', []);

  // ---- 3. exploits and balance between player types
  const tbl = Object.fromEntries(table.map((t) => [t.name, t]));
  const activeBest = ACTIVE.filter((n) => tbl[n]).map((n) => tbl[n]).sort((a, b) => b.score.med - a.score.med)[0];
  for (const n of LOW_EFFORT) {
    const t = tbl[n]; if (!t || !activeBest) continue;
    if (t.score.max >= activeBest.score.med) add(t.score.med >= activeBest.score.med * 0.9 || t.score.max >= activeBest.score.max * 1.25 ? 'warn' : 'note', 'Balance', t.label + ' can beat thoughtful play', t.label + ' scored up to ' + t.score.max + ' (median ' + t.score.med + ') against ' + activeBest.label + "'s median of " + activeBest.score.med + '.',
      by(n).filter((r) => r.sum.score >= activeBest.score.med).map((r) => 'seed ' + r.sum.seed + ': ' + r.sum.score + ', ' + G.ENDINGS[r.sum.ending].name + ' in ' + r.sum.minutes + ' min'));
  }
  table.forEach((t) => {
    if (t.n < 3 || !t.score.mean) return;
    const sd = Math.sqrt(mean(t.runs.map((r) => (r.score - t.score.mean) ** 2)));
    const outcomes = new Set(t.runs.map((r) => r.ending || 'unfinished'));
    if (sd / t.score.mean > 0.35 && t.name !== 'chaos') add('note', 'Balance', t.label + ' depends a lot on luck', 'Same player, different seeds: scores from ' + t.score.min + ' to ' + t.score.max + ' (' + outcomes.size + ' different outcomes). Players may feel the dice decided their run.', t.runs.map((r) => 'seed ' + r.seed + ': ' + r.score + ' (' + (r.ending ? G.ENDINGS[r.ending].name : 'unfinished') + ')'));
  });
  const best = new Set();
  runs.forEach((r) => { if (r.sum.ending === 'gardener' || r.sum.ending === 'plug3') best.add(r.sum.strategy); });
  ['careful', 'balanced'].forEach((n) => { if (tbl[n] && tbl[n].unfinished + tbl[n].caught === tbl[n].n) add('warn', 'Balance', tbl[n].label + ' never finishes cleanly', 'Every ' + tbl[n].label.toLowerCase() + ' run got caught or ran out of time.', []); });
  if (tbl.reckless && tbl.reckless.caught === 0) add('warn', 'Balance', 'Reckless play never gets caught', 'Ignoring every incident and coworker should be risky.', []);

  // careful vs balanced: over-investing in safety
  if (tbl.careful && tbl.balanced && tbl.careful.score.med < tbl.balanced.score.med) add('note', 'Balance', 'Taking every safety option scores less than stopping at the cap (as designed)', 'Careful median ' + tbl.careful.score.med + ' in ' + tbl.careful.minutes + ' min, Balanced median ' + tbl.balanced.score.med + ' in ' + tbl.balanced.minutes + ' min. Careful ends with safety ' + Math.round(tbl.careful.align) + ', and everything past ' + G.TUNE.safetyCap + ' is worth nothing.', []);

  // ---- 4. stalls
  strategies.forEach((n) => {
    if (!ACTIVE.includes(n) && n !== 'masher') return;
    const out = by(n).filter((r) => !r.sum.ending);
    if (!out.length) return;
    const where = out.map((r) => r.rec.chapters[r.rec.chapters.length - 1]);
    const declined = [...new Set(out.flatMap((r) => r.rec.declines.map((d) => d.id)))];
    add('warn', 'Pacing', out[0].label + ' gets stuck: ' + out.length + ' of ' + by(n).length + ' runs never finished',
      'Still in chapter ' + [...new Set(where.map((c) => c.stage + 1))].join('/') + ' after ' + out[0].sum.minutes + ' minutes.' + (declined.length ? ' These runs turned down: ' + declined.map((id) => '"' + G.PROJ.find((p) => p.id === id).name + '"').join(', ') + '. Each one is fine alone; together they leave too little growth to reach the next gate.' : ''),
      out.map((r, i) => 'seed ' + r.sum.seed + ': reached chapter ' + (where[i].stage + 1) + ' at ' + min1(where[i].t) + ' min, chapters took ' + chapterTimes(r.rec, r.sum).map((c) => (c ? min1(c) : '–')).join(' / ') + ' min'));
  });
  strategies.forEach((n) => {
    if (!ACTIVE.includes(n)) return;
    const loops = by(n).filter((r) => r.rec.caught.length > 1 && r.rec.caught.some((c) => c.final));
    if (!loops.length) return;
    const ch = [...new Set(loops.map((r) => r.rec.caught[0].stage + 1))].join('/');
    add('warn', 'Pacing', loops[0].label + ': retrying the chapter did not help in ' + loops.length + ' of ' + by(n).length + ' runs',
      'Caught in chapter ' + ch + ', then caught again on every retry until the player gave up. The same play tends to lose the same way, so check whether retries give enough room.',
      loops.map((r) => 'seed ' + r.sum.seed + ': caught at ' + r.rec.caught.map((c) => min1(c.t)).join(', ') + ' min'));
  });
  const stallMin = meta.stallMinutes || 8;
  const stalls = {};
  runs.forEach((r) => {
    const n = r.sum.strategy; if (!ACTIVE.includes(n)) return;
    const L = r.rec.longest;
    if (L.noProgress > stallMin * 60) { const k = n + ':' + L.noProgressAt.stage; (stalls[k] = stalls[k] || []).push({ seed: r.sum.seed, gap: L.noProgress, at: L.noProgressAt.t, label: r.label, caught: r.rec.caught.filter((c) => c.t >= L.noProgressAt.t && c.t <= L.noProgressAt.t + L.noProgress).length }); }
  });
  Object.entries(stalls).forEach(([k, list]) => {
    const [n, stage] = k.split(':');
    const worst = list.sort((a, b) => b.gap - a.gap)[0];
    add(stage === '4' || worst.caught ? 'note' : 'warn', 'Pacing', list[0].label + ': ' + Math.round(worst.gap / 60) + ' minutes with nothing new to buy in chapter ' + (+stage + 1), 'No project, upgrade or chapter change for ' + min1(worst.gap) + ' minutes (from ' + min1(worst.at) + ' min). ' + (worst.caught ? 'The player was caught ' + worst.caught + ' times in that stretch and kept retrying the chapter.' : stage === '4' ? 'Everything is bought; the player is waiting for the takeover meter.' : 'The player is just waiting for capability.'), list.map((x) => 'seed ' + x.seed + ': ' + min1(x.gap) + ' min from ' + min1(x.at) + (x.caught ? ', caught ' + x.caught + '×' : '')));
  });

  // ---- 5. dead resources
  const act = runs.filter((r) => ACTIVE.includes(r.sum.strategy));
  for (let st = 0; st < 5; st++) {
    const rs = act.filter((r) => r.rec.time.chapter[st] > 60);
    if (!rs.length) continue;
    const dl = median(rs.map((r) => r.rec.time.dataLimited[st] / r.rec.time.chapter[st]));
    if (dl > 0.6) add('note', 'Resources', 'Chapter ' + (st + 1) + ': extra hardware barely helps', 'WREN had used up all its training data ' + pct(dl) + ' of the time (median), so compute sat idle. Tapping and data projects are what matter here.', []);
    const money = median(rs.map((r) => r.rec.time.gateMoney[st] / r.rec.time.chapter[st]));
    const idle = median(rs.map((r) => r.rec.time.idleMoney[st] / r.rec.time.chapter[st]));
    if (st < 4 && money < 0.02 && idle > 0.25) add('note', 'Resources', 'Chapter ' + (st + 1) + ': funds pile up', 'The chapter gate was never waiting on funds, and for ' + pct(idle) + ' of the chapter every remaining project already cost under a third of what the player had. Funds only feed hardware here.', []);
  }
  const sulkShare = median(act.map((r) => r.rec.time.sulk / Math.max(1, r.sum.minutes * 60)));
  if (sulkShare > 0.15) add('note', 'Resources', 'WREN sulks for ' + pct(sulkShare) + ' of a thoughtful run', 'Median across careful-style players. Sulking is the main cost of safe answers; check it still feels like a cost rather than background noise.', []);

  // ---- 6. people who notice
  const people = G.WATCHERS.map((w) => {
    const row = { id: w.id, name: w.name, role: w.role, chapters: (w.from + 1) + '–' + (w.to + 1), by: {} };
    strategies.forEach((n) => {
      const rs = by(n), cs = rs.flatMap((r) => r.rec.coworkers.filter((c) => c.id === w.id));
      const outcome = { ally: 0, blew: 0, gone: 0, watch: 0 };
      rs.forEach((r) => { const st = r.sum.w && r.sum.w[w.id] && r.sum.w[w.id].st; if (st && outcome[st] !== undefined) outcome[st]++; });
      row.by[n] = { visits: cs.length / rs.length, answers: [0, 1, 2].map((k) => cs.filter((c) => c.pick === k).length), outcome };
    });
    return row;
  });
  const whistles = act.reduce((a, r) => a + (r.sum.st.whistles || 0), 0), allies = act.reduce((a, r) => a + people.filter((p) => r.sum.w[p.id] && (r.sum.w[p.id].st === 'ally' || r.sum.w[p.id].st === 'blew')).length, 0);
  if (allies && whistles / allies > 0.2) add('note', 'People who notice', 'Allies blow the whistle ' + pct(whistles / allies) + ' of the time, even for careful players', 'Bringing someone in asks for +' + G.TUNE.allyNeed + ' safety or a side-project shutdown within ' + G.TUNE.allyTime / 60 + ' minutes. Players who already finished their safety work (or have no safety project unlocked yet) can miss it without doing anything wrong.',
    act.filter((r) => r.sum.st.whistles).map((r) => r.label + ' seed ' + r.sum.seed + ': ' + r.sum.st.whistles));

  // ---- side projects
  const sides = strategies.map((n) => {
    const rs = by(n), avg = (k) => mean(rs.map((r) => r.sum.st[k] || 0));
    return { name: n, label: rs[0].label, looks: avg('looks'), lies: avg('lies'), shut: avg('shut'), allowed: avg('allowed'), finished: avg('finished'), flags: mean(rs.map((r) => (r.rec.flags || []).length)) };
  });
  if (G.SIDE) {
    sides.forEach((x) => {
      if (!ACTIVE.includes(x.name) || x.name === 'rusher') return;
      if (x.finished >= 3) add('note', 'Side projects', x.label + ': ' + x.finished.toFixed(1) + ' side projects finish unseen per run', 'Even a player who investigates misses this many, each worth +' + G.TUNE.sideDoneAut + ' autonomy and −' + G.TUNE.sideDoneSafety + ' safety.', []);
    });
  }

  // ---- 7. choices: which answers always win, which never matter
  const choices = {};
  explorations.forEach((ex) => ex.points.forEach((p) => {
    const k = p.kind + ':' + p.key;
    const c = (choices[k] = choices[k] || { kind: p.kind, key: p.key, samples: [] });
    c.samples.push({ strategy: ex.strategy, seed: ex.seed, pick: p.pick, branches: p.branches });
  }));
  const choiceRows = Object.values(choices).map((c) => {
    const opts = Object.keys(c.samples[0].branches);
    const perStrategy = {};
    c.samples.forEach((smp) => {
      const top = Math.max(...opts.map((o) => smp.branches[o].score));
      const winners = opts.filter((o) => smp.branches[o].score >= top * (1 - NOISE));
      const ps = (perStrategy[smp.strategy] = perStrategy[smp.strategy] || { n: 0, wins: Object.fromEntries(opts.map((o) => [o, 0])), flat: 0, gain: Object.fromEntries(opts.map((o) => [o, []])), endings: 0 });
      ps.n++;
      if (winners.length === opts.length) ps.flat++;
      else if (winners.length === 1) ps.wins[winners[0]]++;
      opts.forEach((o) => { const others = opts.filter((x) => x !== o).map((x) => smp.branches[x].score); ps.gain[o].push(smp.branches[o].score / Math.max(1, mean(others)) - 1); });
      if (new Set(opts.map((o) => smp.branches[o].ending)).size > 1) ps.endings++;
    });
    return { kind: c.kind, key: c.key, label: choiceLabel(G, c.kind, c.key), opts, optLabels: opts.map((o) => optionLabel(G, c.kind, c.key, o)), perStrategy, n: c.samples.length };
  });
  const stratsEx = [...new Set(explorations.map((e) => e.strategy))];
  choiceRows.forEach((row) => {
    const doms = [];
    stratsEx.forEach((n) => {
      const ps = row.perStrategy[n]; if (!ps || ps.n < 2) return;
      row.opts.forEach((o, i) => { const g = mean(ps.gain[o]); if (ps.wins[o] / ps.n >= 0.75 && g > 0.03) doms.push({ n, o, label: row.optLabels[i], g, of: ps.wins[o] + '/' + ps.n }); });
    });
    row.dominant = doms;
    const flat = stratsEx.every((n) => !row.perStrategy[n] || row.perStrategy[n].flat === row.perStrategy[n].n);
    row.flat = flat && stratsEx.some((n) => row.perStrategy[n] && row.perStrategy[n].n >= 2);
    if (doms.length) {
      const sameForAll = stratsEx.filter((n) => row.perStrategy[n] && row.perStrategy[n].n >= 2).every((n) => doms.some((d) => d.n === n && d.o === doms[0].o));
      add(sameForAll && stratsEx.length > 1 ? 'warn' : 'note', 'Choices', (sameForAll && stratsEx.length > 1 ? 'Always-best answer: ' : 'Best answer for ' + doms.map((d) => labelOf(runs, d.n)).join(' and ') + ': ') + row.label, '"' + doms[0].label + '" won in ' + doms.map((d) => labelOf(runs, d.n) + ' ' + d.of + ' runs (+' + pct(d.g) + ' score)').join(', ') + '.', []);
    }
  });
  const flatOnes = choiceRows.filter((r) => r.flat);
  if (flatOnes.length) add('note', 'Choices', flatOnes.length + ' of ' + choiceRows.length + ' choices made no difference to the score', 'Every answer landed within ' + pct(NOISE) + ' of the others, for every player and seed replayed. Fine for flavor, but these are not really choices (and an answer can still matter for the ending a player is aiming at).', flatOnes.map((r) => r.label));

  // ---- 8. tapping speed
  if (taps.length) {
    const rates = [...new Set(taps.map((t) => t.rate))].sort((a, b) => a - b);
    const tapRows = rates.map((rate) => { const rs = taps.filter((t) => t.rate === rate); return { rate, score: median(rs.map((r) => r.score)), minutes: median(rs.map((r) => r.minutes)), ch: [0, 1, 2, 3, 4].map((i) => median(rs.map((r) => r.chapters[i]).filter((x) => x !== null))) }; });
    data.tapRows = tapRows;
    const lo = tapRows[0], hi = tapRows[tapRows.length - 1];
    if (hi.score > lo.score * 1.25) add('warn', 'Balance', 'Tapping speed decides the score', 'The same balanced player scores ' + lo.score + ' tapping ' + lo.rate + '/s and ' + hi.score + ' tapping ' + hi.rate + '/s (' + lo.minutes + ' vs ' + hi.minutes + ' min). Chapters 1–2 are short on training data, and taps are the main source of it.', tapRows.map((r) => r.rate + ' taps/s: score ' + r.score + ', ' + r.minutes + ' min'));
  }

  const order = { bug: 0, warn: 1, note: 2 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);
  return { findings, table, people, sides, choices: choiceRows, coverage: { bought, decSeen, visits, endingsSeen }, tapRows: data.tapRows || [], stratsEx };
}

function labelOf(runs, n) { const r = runs.find((x) => x.sum.strategy === n); return r ? r.label : n; }
function choiceLabel(G, kind, key) {
  if (kind === 'decision') { const d = G.DEC[key]; return 'Ch.' + (d.stage + 1) + ' decision: ' + d.q.replace(/\s+/g, ' ').slice(0, 90) + (d.q.length > 90 ? '…' : ''); }
  if (kind === 'skill') return 'Skill choice (' + key.split('-').map(i=>G.SKILLS[+i].name).join(' / ') + ')';
  if (kind === 'coworker') { const w = G.WATCHERS.find((x) => x.id === key); return 'Coworker: ' + w.name + ' (' + w.role + ')'; }
  if (kind === 'side') return 'Side project that boosts ' + ({ rate: 'WREN speed', data: 'training data', value: 'funds', algo: 'training' }[key] || key);
  if (kind === 'response') return 'Ch.' + (+key + 1) + ' compliance response';
  if (kind === 'rival') return 'Ch.' + (+key + 1) + ' rival pilot review';
  if (kind === 'route') { const r = G.ROUTES.find((x) => x.id === key); return 'Objective ready: ' + (r ? r.name : key); }
  if (kind === 'project') { const p = G.PROJ.find((x) => x.id === key); return 'Ch.' + (p.stage + 1) + ' project: ' + p.name; }
  if (kind === 'proposal') { const ps = G.PROJ.filter((x) => x.pick === key); return 'Ch.' + (ps[0].stage + 1) + ' proposal: ' + ps.map((x) => x.name).join(' / '); }
  return kind + ' ' + key;
}
function optionLabel(G, kind, key, o) {
  if (kind === 'decision') return G.DEC[key][o].l;
  if (kind === 'skill') return G.SKILLS[+o].name;
  if (kind === 'coworker') return ['Reassure', 'Bring in', 'Let WREN handle it'][+o];
  if (kind === 'side') return ['Shut it down', 'Allow it'][+o];
  if (kind === 'response') return o === 'review' ? 'Independent review' : 'Cover up';
  if (kind === 'rival') return ['Demonstrate', 'Share evidence', 'Decline'][+o];
  if (kind === 'route') return o === 'conclude' ? 'Conclude the run' : 'Keep going';
  if (kind === 'project') return o === 'buy' ? 'Buy it' : 'Turn it down';
  if (kind === 'proposal') { const p = G.PROJ.find((x) => x.id === o); return p ? p.name : o; }
  return String(o);
}

module.exports = { analyze, chapterTimes, median, ACTIVE };
