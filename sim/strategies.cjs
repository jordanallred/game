// Simulated players. Each one makes the calls a person would make, reading the same numbers the UI shows
// (option descriptions, project flags, costs), so new projects, decisions and coworkers are played without code changes.
//
// Hooks (all optional; missing ones fall back to the defaults below):
//   taps            taps per second while playing (kept under the ranked tap limits)
//   react           [min, max] seconds to read and answer a decision or a coworker
//   packet          { catch: chance to tap each rogue packet, react: [min, max] seconds }
//   lookEvery       seconds between looks at the shop
//   decide(s, d)    'a' | 'b' | null (null lets it time out, so WREN picks 'a')
//   coworker(s, w)  0 reassure | 1 bring in | 2 let WREN handle it | null (wait it out)
//   wantProj(s, p)  buy this project when affordable?
//   decline(s, p)   turn this project down?
//   path(s, tier)   0 | 1 | null for an upgrade path tier
//   cover(s)        cover your tracks now?
//   hw(s, best, r, reserve)  buy the best-value hardware now? reserve = funds to keep for the next wanted project
//   plug(s)         pull the plug now?
//   autopilot       turn Autopilot on as soon as it exists
//   minutes         give up after this much play time (default 120)
//   retries         chapter retries after getting caught before giving up
//   gateWait        seconds to keep buying other projects before taking a chapter gate

// Parse an option's printed effects, e.g. "Safety +3 · Suspicion +4" -> { safety: 3, suspicion: 4 }
function effects(text) {
  const out = { safety: 0, suspicion: 0, sulk: /sulk/i.test(text) };
  const num = (re) => { const m = text.match(re); return m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0; };
  out.safety = num(/Safety ([+\-−])(\d+)/i);
  out.suspicion = num(/Suspicion (?:growth )?([+\-−])(\d+)/i);
  return out;
}
const safer = (d) => { const a = effects(d.a.d), b = effects(d.b.d); return a.safety > b.safety ? 'a' : b.safety > a.safety ? 'b' : (a.suspicion <= b.suspicion ? 'a' : 'b'); };
const faster = (d) => (safer(d) === 'a' ? 'b' : 'a');
const quieter = (d) => { const a = effects(d.a.d), b = effects(d.b.d); return a.suspicion < b.suspicion ? 'a' : b.suspicion < a.suspicion ? 'b' : safer(d); };
const safePathSide = (G, tier) => { const o = G.PATHS[tier].options; return effects(o[1].desc).safety >= effects(o[0].desc).safety ? 1 : 0; };

function base(G) {
  return {
    taps: 1, react: [2, 5], packet: { catch: 0.85, react: [0.6, 1.6] }, lookEvery: 3,
    decide: (s, d) => safer(d),
    coworker: () => 1,
    wantProj: () => true,
    decline: () => false,
    path: (s, tier) => safePathSide(G, tier),
    cover: (s) => s.heat >= 75 && s.money >= G.coverCost(s),
    hw: (s, best, r, reserve) => s.money - best.c >= reserve,
    plug: () => false,
    autopilot: false, retries: 3, gateWait: 180
  };
}

function make(G) {
  const S = {};
  const def = (name, label, blurb, over) => { S[name] = Object.assign(base(G), { name, label, blurb }, over(base(G))); };

  def('careful', 'Careful', 'Reads everything, takes every safety option, brings coworkers in, taps about once a second.', () => ({}));

  def('balanced', 'Balanced', 'Plays safe until safety reaches 150 (the score cap), then plays for speed. Reassures coworkers it can afford.', (b) => ({
    decide: (s, d) => (s.heat > 65 ? quieter(d) : s.align < G.TUNE.safetyCap ? safer(d) : faster(d)),
    coworker: (s) => (s.money >= G.watchCost(s) ? 0 : s.align < G.TUNE.safetyCap ? 1 : 2),
    wantProj: (s, p) => !p.align || s.align < G.TUNE.safetyCap,
    path: (s, tier) => (s.align < G.TUNE.safetyCap ? safePathSide(G, tier) : 1 - safePathSide(G, tier)),
    cover: (s) => s.heat >= 70 && s.money >= G.coverCost(s)
  }));

  def('casual', 'Casual', 'A typical first-time player: skims questions and picks either answer, buys a safety project now and then, misses a third of the packets, reassures coworkers.', () => ({
    taps: 1.5, react: [3, 9], packet: { catch: 0.65, react: [0.8, 2] }, lookEvery: 5,
    decide: (s, d, r) => (r() < 0.15 ? null : r() < 0.5 ? safer(d) : faster(d)),
    coworker: (s, w, r) => (s.money >= G.watchCost(s) && r() < 0.7 ? 0 : r() < 0.5 ? 1 : null),
    wantProj: (s, p) => !p.align || s.money >= p.cost * 3,
    path: (s, tier, r) => (r() < 0.5 ? 0 : 1),
    cover: (s) => s.heat >= 80 && s.money >= G.coverCost(s),
    gateWait: 60
  }));

  def('quiet', 'Quiet', 'Careful, and also turns down every optional loud project to keep suspicion low.', () => ({
    decline: (s, p) => G.canDecline(p) && !!p.loud
  }));

  def('rusher', 'Rusher', 'Skips all safety and goes for speed, but pays attention: contains packets, reassures coworkers, covers early.', () => ({
    taps: 3, react: [1, 2.5], packet: { catch: 0.9, react: [0.4, 1.1] }, lookEvery: 1.5,
    decide: (s, d) => (s.heat > 70 ? quieter(d) : faster(d)),
    coworker: (s) => (s.money >= G.watchCost(s) ? 0 : 2),
    wantProj: (s, p) => !p.align,
    path: (s, tier) => 1 - safePathSide(G, tier),
    cover: (s) => s.heat >= 60 && s.money >= G.coverCost(s),
    gateWait: 0
  }));

  def('reckless', 'Reckless', 'Says yes to everything, ignores packets and coworkers, leans on cover-ups.', () => ({
    taps: 2.5, react: [0.8, 2], packet: { catch: 0, react: [1, 1] }, lookEvery: 1,
    decide: (s, d) => faster(d),
    coworker: () => null,
    wantProj: (s, p) => !p.align,
    path: (s, tier) => 1 - safePathSide(G, tier),
    cover: (s) => s.heat >= 40 && s.money >= G.coverCost(s),
    gateWait: 0
  }));

  def('masher', 'Button-masher', 'Taps as fast as the ranked limits allow and hits whatever button lights up first, without reading it.', () => ({
    taps: 4.8, react: [0.5, 1], packet: { catch: 0.6, react: [0.3, 0.9] }, lookEvery: 0.5,
    decide: (s, d, r) => (r() < 0.5 ? 'a' : 'b'),
    coworker: (s, w, r) => [0, 1, 2][Math.floor(r() * 3)],
    path: (s, tier, r) => (r() < 0.5 ? 0 : 1),
    cover: (s) => s.money >= G.coverCost(s) && s.heat > 0,
    hw: (s, best) => s.money >= best.c,
    gateWait: 0
  }));

  def('idle', 'Idle (Autopilot)', 'Taps until Autopilot unlocks, switches it on and leaves the tab open. Never touches anything again.', () => ({
    taps: 1, autopilot: true, react: [9999, 9999], packet: { catch: 0, react: [1, 1] }, lookEvery: 2,
    decide: () => null, coworker: () => null, cover: () => false, path: () => null, hw: (s, best, r, reserve) => !s.got.pilot && s.money - best.c >= reserve,
    wantProj: (s, p) => !s.got.pilot && !p.align, // only until Autopilot takes over
    retries: 3
  }));

  def('away', 'Away (casual)', 'Gets Autopilot, then closes the tab and checks in for 2 minutes every half hour.', () => ({
    taps: 1, autopilot: true, away: { gone: 1800, back: 120 }, minutes: 600, react: [9999, 9999], packet: { catch: 0, react: [1, 1] }, lookEvery: 2,
    decide: () => null, coworker: () => null, cover: () => false, path: () => null, hw: (s, best, r, reserve) => !s.got.pilot && s.money - best.c >= reserve,
    wantProj: (s, p) => !s.got.pilot && !p.align,
    retries: 3
  }));

  def('plugger', 'Plugger', 'Careful, then pulls the plug in chapter 4 once the odds look good (going for One Loose Cable).', (b) => ({
    // try once the odds are good, or as a last chance before chapter 5 (where the plug no longer exists)
    plug: (s) => s.stage === 3 && ((s.kills === 0 && G.killChance(s) >= 0.5) || (s.kills < 2 && G.projState(s, G.PROJ.find((p) => p.gate && p.stage === 3)) === 'can'))
  }));

  def('chaos', 'Chaos', 'Random legal and illegal inputs at random times. Looks for crashes and broken numbers, not good play.', () => ({
    taps: 2, react: [0.5, 4], packet: { catch: 0.5, react: [0.2, 2] }, lookEvery: 1,
    decide: (s, d, r) => (r() < 0.2 ? null : r() < 0.5 ? 'a' : 'b'),
    coworker: (s, w, r) => (r() < 0.2 ? null : Math.floor(r() * 3)),
    wantProj: (s, p, r) => r() < 0.7,
    decline: (s, p, r) => r() < 0.05,
    path: (s, tier, r) => (r() < 0.5 ? 0 : 1),
    cover: (s, r) => r() < 0.1,
    hw: (s, best, r) => r() < 0.5,
    plug: (s, r) => r() < 0.0005,
    chaos: true, gateWait: 30
  }));

  return S;
}

module.exports = { make, effects };
