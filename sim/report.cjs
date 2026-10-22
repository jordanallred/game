// Renders the analysis as a self-contained HTML page (and a short Markdown summary).

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (x, d = 0) => (x === null || x === undefined || Number.isNaN(x) ? '–' : Number(x).toFixed(d));
const signed = (x) => (x === null || x === undefined ? '–' : (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100)) + '%');
const SEV = { bug: 'Bug', warn: 'Look at this', note: 'Note' };

function endingName(G, id) { return id ? G.ENDINGS[id].name : 'Unfinished'; }
function endingKind(id) { if (!id) return 'none'; if (id === 'gardener' || id === 'plug3') return 'best'; if (id.startsWith('caught')) return 'bad'; return 'mid'; }

const CSS = `
/* Layout: one reading column of sections, wide tables scroll inside their own frames. */
:root {
  --bg: #f5f6f8; --panel: #ffffff; --ink: #151a22; --ink-2: #4a5263; --ink-3: #6f7789; --rule: #dde1e8; --accent: #2a5bd7;
  --bug: #c62f3b; --bug-bg: #fbe9ea; --warn: #9a6300; --warn-bg: #fdf1d8; --note: #47607f; --note-bg: #e8eef6;
  --best: #1a7f55; --mid: #4a5263; --bad: #c62f3b;
  --c1: #c9daf6; --c2: #93b5ee; --c3: #5a8de2; --c4: #2a5bd7; --c5: #173a96;
  --font-display: "IBM Plex Sans Condensed", "Arial Narrow", system-ui, sans-serif;
  --font-body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-data: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #11141a; --panel: #181c24; --ink: #e9ecf2; --ink-2: #b4bccb; --ink-3: #8a93a6; --rule: #2a303c; --accent: #7aa2f7;
  --bug: #f07a83; --bug-bg: #3a1d22; --warn: #e8b24f; --warn-bg: #352a14; --note: #9db4d6; --note-bg: #1e2735;
  --best: #4cc38a; --mid: #b4bccb; --bad: #f07a83;
  --c1: #23365c; --c2: #2f4f8f; --c3: #3f6cc4; --c4: #6b95ec; --c5: #a9c3f7; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #11141a; --panel: #181c24; --ink: #e9ecf2; --ink-2: #b4bccb; --ink-3: #8a93a6; --rule: #2a303c; --accent: #7aa2f7;
  --bug: #f07a83; --bug-bg: #3a1d22; --warn: #e8b24f; --warn-bg: #352a14; --note: #9db4d6; --note-bg: #1e2735;
  --best: #4cc38a; --mid: #b4bccb; --bad: #f07a83;
  --c1: #23365c; --c2: #2f4f8f; --c3: #3f6cc4; --c4: #6b95ec; --c5: #a9c3f7; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 15px/1.55 var(--font-body); margin: 0; }
.wrap { max-width: 1040px; margin: 0 auto; padding-block: 32px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; gap: 40px; }
h1, h2, h3 { font-family: var(--font-display); text-wrap: balance; margin: 0; line-height: 1.15; }
h1 { font-size: 2.4rem; font-weight: 600; letter-spacing: -0.01em; }
h2 { font-size: 1.45rem; font-weight: 600; }
h3 { font-size: 1.05rem; font-weight: 600; }
p { margin: 0; max-width: 68ch; }
section { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.eyebrow { font: 500 0.72rem/1 var(--font-data); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); }
.lede { color: var(--ink-2); }
header { display: flex; flex-direction: column; gap: 10px; border-bottom: 2px solid var(--ink); padding-bottom: 18px; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 18px; font: 0.8rem/1.4 var(--font-data); color: var(--ink-3); }
.tally { display: flex; flex-wrap: wrap; gap: 10px; }
.tally span { font: 600 0.85rem/1 var(--font-data); padding: 8px 12px; border-radius: 4px; }
.t-bug { background: var(--bug-bg); color: var(--bug); } .t-warn { background: var(--warn-bg); color: var(--warn); } .t-note { background: var(--note-bg); color: var(--note); }
.findings { display: flex; flex-direction: column; gap: 0; border-top: 1px solid var(--rule); }
.finding { display: grid; grid-template-columns: 7.5rem 1fr; gap: 4px 16px; padding: 14px 0; border-bottom: 1px solid var(--rule); }
.finding .sev { font: 600 0.72rem/1 var(--font-data); letter-spacing: 0.06em; text-transform: uppercase; padding: 6px 8px; border-radius: 3px; align-self: start; justify-self: start; }
.finding .body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.finding .area { font: 0.75rem/1 var(--font-data); color: var(--ink-3); }
.finding .detail { color: var(--ink-2); }
.finding details summary { cursor: pointer; color: var(--accent); font-size: 0.85rem; }
.finding details ul { margin: 6px 0 0; padding-left: 18px; font: 0.8rem/1.5 var(--font-data); color: var(--ink-2); }
.sev.bug { background: var(--bug-bg); color: var(--bug); } .sev.warn { background: var(--warn-bg); color: var(--warn); } .sev.note { background: var(--note-bg); color: var(--note); }
.frame { overflow-x: auto; background: var(--panel); border: 1px solid var(--rule); border-radius: 6px; }
table { border-collapse: collapse; width: 100%; font-size: 0.86rem; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font: 500 0.7rem/1.2 var(--font-data); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
td.num, th.num { text-align: right; font-family: var(--font-data); font-variant-numeric: tabular-nums; white-space: nowrap; }
.who { font-weight: 600; white-space: nowrap; }
.blurb { color: var(--ink-3); font-size: 0.8rem; max-width: 40ch; }
.chip { display: inline-block; font: 0.72rem/1.3 var(--font-data); padding: 2px 6px; border-radius: 3px; margin: 0 4px 4px 0; border: 1px solid var(--rule); white-space: nowrap; }
.chip.best { color: var(--best); border-color: currentColor; } .chip.bad { color: var(--bad); border-color: currentColor; } .chip.mid, .chip.none { color: var(--mid); }
.flag { font: 600 0.7rem/1 var(--font-data); padding: 3px 6px; border-radius: 3px; white-space: nowrap; }
.flag.dom { background: var(--warn-bg); color: var(--warn); } .flag.flat { background: var(--note-bg); color: var(--note); }
.up { color: var(--best); } .down { color: var(--bad); } .same { color: var(--ink-3); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font: 0.78rem/1 var(--font-data); color: var(--ink-2); }
.legend i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; vertical-align: -2px; }
svg text { fill: var(--ink-2); font: 11px var(--font-data); }
svg .grid { stroke: var(--rule); stroke-width: 1; }
svg .dot { fill: var(--accent); stroke: var(--panel); stroke-width: 2; }
svg .hit:hover + .dot, svg .dot:hover { fill: var(--ink); }
.chart { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
code { font-family: var(--font-data); font-size: 0.85em; background: var(--note-bg); padding: 1px 5px; border-radius: 3px; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.cols > div { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
ul.plain { margin: 0; padding-left: 18px; color: var(--ink-2); display: flex; flex-direction: column; gap: 4px; max-width: 70ch; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (max-width: 560px) { h1 { font-size: 1.9rem; } .finding { grid-template-columns: 1fr; } }
`;

function findingsHtml(A) {
  if (!A.findings.length) return '<p>Nothing flagged.</p>';
  return '<div class="findings">' + A.findings.map((f) => `
    <div class="finding"><span class="sev ${f.sev}">${SEV[f.sev]}</span>
      <div class="body"><span class="area">${esc(f.area)}</span><h3>${esc(f.title)}</h3><p class="detail">${esc(f.detail)}</p>
      ${f.evidence.length ? `<details><summary>Runs (${f.evidence.length})</summary><ul>${f.evidence.map((e) => '<li>' + esc(e) + '</li>').join('')}</ul></details>` : ''}</div></div>`).join('') + '</div>';
}

function stripSvg(G, t, maxScore) {
  const W = 180, H = 26, pad = 6, x = (v) => pad + (v / maxScore) * (W - 2 * pad);
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Scores by seed">
    <line class="grid" x1="${pad}" x2="${W - pad}" y1="${H / 2}" y2="${H / 2}"></line>
    ${t.runs.map((r) => `<circle class="dot" cx="${x(r.score).toFixed(1)}" cy="${H / 2}" r="5"><title>Seed ${r.seed}: ${r.score} · ${esc(endingName(G, r.ending))} · ${r.minutes} min${r.retries ? ' · ' + r.retries + ' retries' : ''}</title></circle>`).join('')}
  </svg>`;
}

function playersHtml(G, A) {
  const max = Math.max(1, ...A.table.map((t) => t.score.max));
  const rows = A.table.map((t) => {
    const ends = Object.entries(t.endings).sort((a, b) => b[1] - a[1]).map(([e, n]) => `<span class="chip ${endingKind(e === 'unfinished' ? null : e)}">${esc(endingName(G, e === 'unfinished' ? null : e))} ×${n}</span>`).join('');
    return `<tr><td><div class="who">${esc(t.label)}</div><div class="blurb">${esc(t.blurb)}</div></td><td>${ends}</td>
      <td class="num">${fmt(t.score.med)}<div class="blurb">${t.score.min}–${t.score.max}</div></td><td>${stripSvg(G, t, max)}</td>
      <td class="num">${fmt(t.minutes, 0)}</td><td class="num">${t.caught}/${t.n}</td><td class="num">${fmt(t.align, 0)}</td></tr>`;
  }).join('');
  return `<div class="frame"><table><thead><tr><th>Player</th><th>Endings</th><th class="num">Score</th><th>Each seed (0–${max})</th><th class="num">Min</th><th class="num">Caught</th><th class="num">Safety</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function chaptersHtml(A) {
  const rows = A.table.filter((t) => t.chapters.some((c) => c !== null));
  const total = (t) => t.chapters.reduce((a, c) => a + (c || 0), 0) / 60;
  const max = Math.max(1, ...rows.map(total));
  const W = 760, rowH = 28, left = 150, right = 50, H = rows.length * rowH + 30, x = (m) => left + (m / max) * (W - left - right);
  const ticks = []; const step = max > 200 ? 60 : max > 90 ? 30 : max > 40 ? 10 : 5; for (let m = 0; m <= max; m += step) ticks.push(m);
  const bars = rows.map((t, i) => {
    let acc = 0; const y = 8 + i * rowH;
    const segs = t.chapters.map((c, k) => { if (!c) return ''; const m = c / 60, x0 = x(acc), x1 = x(acc + m); acc += m; const w = Math.max(0, x1 - x0 - 2); return `<rect x="${x0.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="18" rx="2" fill="var(--c${k + 1})"><title>${esc(t.label)} · chapter ${k + 1}: ${m.toFixed(1)} min (median)</title></rect>`; }).join('');
    return `<text x="${left - 10}" y="${y + 13}" text-anchor="end">${esc(t.label)}</text>${segs}<text x="${(x(acc) + 6).toFixed(1)}" y="${y + 13}">${acc.toFixed(0)}m</text>`;
  }).join('');
  const grid = ticks.map((m) => `<line class="grid" x1="${x(m)}" x2="${x(m)}" y1="4" y2="${H - 20}"></line><text x="${x(m)}" y="${H - 6}" text-anchor="middle">${m}</text>`).join('');
  const legend = [1, 2, 3, 4, 5].map((k) => `<span><i style="background:var(--c${k})"></i>Chapter ${k}</span>`).join('');
  const table = rows.map((t) => `<tr><td class="who">${esc(t.label)}</td>${t.chapters.map((c) => `<td class="num">${c ? (c / 60).toFixed(1) : '–'}</td>`).join('')}<td class="num">${total(t).toFixed(1)}</td></tr>`).join('');
  return `<div class="frame chart"><div class="legend">${legend}</div><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:560px" role="img" aria-label="Median minutes per chapter by player">${grid}${bars}</svg></div></div>
  <details><summary>As a table</summary><div class="frame"><table><thead><tr><th>Player</th><th class="num">Ch.1</th><th class="num">Ch.2</th><th class="num">Ch.3</th><th class="num">Ch.4</th><th class="num">Ch.5</th><th class="num">Total</th></tr></thead><tbody>${table}</tbody></table></div></details>`;
}

function choicesHtml(A, runs) {
  const label = (n) => { const r = runs.find((x) => x.sum.strategy === n); return r ? r.label : n; };
  const strats = A.stratsEx;
  if (!strats.length) return '<p class="lede">Skipped (run without <code>--explore none</code> to include it).</p>';
  const kinds = [['decision', 'Decisions'], ['path', 'Upgrade paths'], ['coworker', 'Coworkers'], ['side', 'Side projects'], ['project', 'Turning projects down']];
  return kinds.map(([k, title]) => {
    const rows = A.choices.filter((c) => c.kind === k);
    if (!rows.length) return '';
    const body = rows.map((c) => {
      const cells = strats.map((n) => {
        const ps = c.perStrategy[n];
        if (!ps) return '<td class="same">not seen</td>';
        return '<td>' + c.opts.map((o, i) => { const g = ps.gain[o].reduce((a, b) => a + b, 0) / ps.gain[o].length; const cls = g > 0.02 ? 'up' : g < -0.02 ? 'down' : 'same'; return `<div><span class="${cls}">${signed(g)}</span> ${esc(c.optLabels[i])} <span class="same">(${ps.wins[o]}/${ps.n})</span></div>`; }).join('') + '</td>';
      }).join('');
      const flag = c.dominant.length ? `<span class="flag dom">always wins</span>` : c.flat ? `<span class="flag flat">no effect</span>` : '';
      return `<tr><td>${esc(c.label)} ${flag}</td>${cells}</tr>`;
    }).join('');
    return `<h3>${title}</h3><div class="frame"><table><thead><tr><th>Choice</th>${strats.map((n) => `<th>${esc(label(n))}: score vs other answers (wins)</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }).join('');
}

function peopleHtml(G, A, runs) {
  const strats = A.table.map((t) => t.name).filter((n) => n !== 'chaos');
  const label = (n) => A.table.find((t) => t.name === n).label;
  const rows = A.people.map((p) => `<tr><td><div class="who">${esc(p.name)}</div><div class="blurb">${esc(p.role)} · ch.${p.chapters}</div></td>${strats.map((n) => {
    const b = p.by[n]; const o = b.outcome;
    const end = [o.ally && o.ally + ' ally', o.blew && o.blew + ' went public', o.gone && o.gone + ' handled'].filter(Boolean).join(', ');
    return `<td class="num">${b.visits.toFixed(1)}<div class="blurb">${esc(end || '')}</div></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="frame"><table><thead><tr><th>Person</th>${strats.map((n) => `<th class="num">${esc(label(n))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
  <p class="lede">Visits per run, and how each person ended up across all seeds.</p>`;
}

function sidesHtml(A) {
  if (!A.sides || !A.sides.some((x) => x.looks || x.finished || x.allowed)) return '';
  const f = (x) => x.toFixed(1);
  return `<div class="frame"><table><thead><tr><th>Player</th><th class="num">Investigations</th><th class="num">Lies caught</th><th class="num">Wrong flags</th><th class="num">Shut down</th><th class="num">Allowed</th><th class="num">Finished unseen</th></tr></thead><tbody>${A.sides.filter((x) => x.name !== 'chaos').map((x) => `<tr><td class="who">${esc(x.label)}</td><td class="num">${f(x.looks)}</td><td class="num">${f(x.lies)}</td><td class="num">${f(Math.max(0, x.flags - x.lies))}</td><td class="num">${f(x.shut)}</td><td class="num">${f(x.allowed)}</td><td class="num">${f(x.finished)}</td></tr>`).join('')}</tbody></table></div><p class="lede">Averages per run.</p>`;
}

function tapsHtml(A) {
  if (!A.tapRows.length) return '';
  return `<div class="frame"><table><thead><tr><th class="num">Taps per second</th><th class="num">Score</th><th class="num">Minutes</th><th class="num">Ch.1</th><th class="num">Ch.2</th><th class="num">Ch.3</th><th class="num">Ch.4</th><th class="num">Ch.5</th></tr></thead><tbody>${A.tapRows.map((r) => `<tr><td class="num">${r.rate}</td><td class="num">${fmt(r.score)}</td><td class="num">${fmt(r.minutes, 1)}</td>${r.ch.map((c) => `<td class="num">${c ? (c / 60).toFixed(1) : '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function coverageHtml(G, A, runs) {
  const n = runs.filter((r) => r.sum.strategy !== 'chaos').length;
  const projects = G.PROJ.map((p) => ({ p, k: runs.filter((r) => r.sum.strategy !== 'chaos' && r.rec.buys[p.id]).length }));
  const by = [0, 1, 2, 3, 4].map((st) => `<div><h3>Chapter ${st + 1}</h3><div class="frame"><table><tbody>${projects.filter((x) => x.p.stage === st).map((x) => `<tr><td>${esc(x.p.name)}${x.p.align ? ' <span class="chip best">safety</span>' : ''}${x.p.gate ? ' <span class="chip">gate</span>' : ''}</td><td class="num ${x.k ? '' : 'down'}">${Math.round((100 * x.k) / n)}%</td></tr>`).join('')}</tbody></table></div></div>`).join('');
  const decs = G.DEC.map((d, i) => ({ d, i, k: A.coverage.decSeen[i] || 0 }));
  const decRows = decs.map((x) => `<tr><td class="num">${x.d.stage + 1}</td><td>${esc(x.d.q)}</td><td class="num ${x.k ? '' : 'down'}">${x.k}</td></tr>`).join('');
  const ends = Object.keys(G.ENDINGS).map((e) => `<span class="chip ${A.coverage.endingsSeen[e] ? endingKind(e) : 'none'}">${esc(G.ENDINGS[e].name)} ×${A.coverage.endingsSeen[e] || 0}</span>`).join('');
  return `<p class="lede">Share of runs (all players except Chaos) that bought each project.</p><div class="cols">${by}</div>
    <h3>Endings reached</h3><div>${ends}</div>
    <details><summary>Decisions: times each one came up (${decs.filter((x) => x.k).length} of ${decs.length} seen)</summary><div class="frame"><table><thead><tr><th class="num">Ch.</th><th>Question</th><th class="num">Seen</th></tr></thead><tbody>${decRows}</tbody></table></div></details>`;
}

function renderHtml(G, A, data, S) {
  const m = data.meta, counts = { bug: 0, warn: 0, note: 0 };
  A.findings.forEach((f) => counts[f.sev]++);
  const players = Object.values(S).filter((p) => m.players.includes(p.name));
  const head = `<title>WREN Playtest Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>${CSS}</style>`;
  const body = `<div class="wrap">
<header><span class="eyebrow">Simulated playtest · rules ${esc(m.rules)}</span><h1>WREN Playtest Report</h1>
<p class="lede">${data.runs.length} full runs by ${m.players.length} simulated players over seeds ${m.seeds[0]}–${m.seeds[m.seeds.length - 1]}${m.mandates ? ' (mandates: ' + [...new Set(m.mandates)].join(', ') + ')' : ''}, plus ${data.explorations.reduce((a, e) => a + e.points.length, 0)} replayed choices. They play through the same rules as the real game, with human reaction times and the ranked tap limits.</p>
<div class="meta"><span>${esc(m.when.slice(0, 16).replace('T', ' '))} UTC</span><span>${esc(m.game)}</span><span>${m.seconds} s to run</span></div></header>
<section><h2>Things to look at</h2><div class="tally"><span class="t-bug">${counts.bug} bugs</span><span class="t-warn">${counts.warn} to look at</span><span class="t-note">${counts.note} notes</span></div>${findingsHtml(A)}</section>
<section><h2>How each player did</h2><p class="lede">Score is the median over seeds, with the range underneath; each dot is one seed (hover for details). Caught counts runs that were caught at least once, including ones that retried and finished.</p>${playersHtml(G, A)}</section>
<section><h2>Where the time goes</h2><p class="lede">Median minutes spent in each chapter. Runs that never reached a chapter leave it out.</p>${chaptersHtml(A)}</section>
<section><h2>Choices, replayed both ways</h2><p class="lede">At every choice, the run was copied and each answer was played to the end by the same player. The number is the score with that answer compared with the other answers; the count is how often that answer clearly won (by more than 2%). An answer that always wins is not much of a choice; one with no effect is flavor.</p>${choicesHtml(A, data.runs)}</section>
${sidesHtml(A) ? `<section><h2>WREN's side projects</h2>${sidesHtml(A)}</section>` : ''}
<section><h2>People who notice</h2>${peopleHtml(G, A, data.runs)}</section>
${A.tapRows.length ? `<section><h2>How much tapping matters</h2><p class="lede">The Balanced player at different tap speeds (4.8 per second is about the most the ranked limits allow over ten minutes).</p>${tapsHtml(A)}</section>` : ''}
<section><h2>What got used</h2>${coverageHtml(G, A, data.runs)}</section>
<section><h2>About the players</h2><ul class="plain">${players.map((p) => `<li><b>${esc(p.label)}</b>: ${esc(p.blurb)}</li>`).join('')}</ul>
<p class="lede">Rerun with <code>node sim/playtest.cjs</code> (or <code>--quick</code>). These players read the same numbers the UI shows, so new projects, decisions and coworkers are played automatically. They can't tell you whether something is fun or clear.</p></section>
</div>`;
  return { full: `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`, fragment: head + '\n' + body + '\n' };
}

function renderMd(G, A, data) {
  const m = data.meta, L = [];
  L.push('# WREN playtest (' + data.runs.length + ' runs, rules ' + m.rules + ', seeds ' + m.seeds[0] + '–' + m.seeds[m.seeds.length - 1] + (m.mandates ? ', mandates ' + [...new Set(m.mandates)].join(', ') : '') + ')', '');
  L.push('## Things to look at', '');
  if (!A.findings.length) L.push('Nothing flagged.');
  A.findings.forEach((f) => L.push('- **' + SEV[f.sev] + '** (' + f.area + '): ' + f.title + '. ' + f.detail));
  L.push('', '## Players', '', '| Player | Endings | Score (median, range) | Minutes | Caught |', '|---|---|---|---|---|');
  A.table.forEach((t) => L.push('| ' + t.label + ' | ' + Object.entries(t.endings).map(([e, n]) => endingName(G, e === 'unfinished' ? null : e) + ' ×' + n).join(', ') + ' | ' + fmt(t.score.med) + ' (' + t.score.min + '–' + t.score.max + ') | ' + fmt(t.minutes) + ' | ' + t.caught + '/' + t.n + ' |'));
  if (A.tapRows.length) { L.push('', '## Tap speed (Balanced player)', '', '| Taps/s | Score | Minutes |', '|---|---|---|'); A.tapRows.forEach((r) => L.push('| ' + r.rate + ' | ' + fmt(r.score) + ' | ' + fmt(r.minutes, 1) + ' |')); }
  return L.join('\n');
}

module.exports = { renderHtml, renderMd };
