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
//   skillBranch(s)  0 automation | 1 research | 2 control | null to save points
//   cover(s)        cover your tracks now?
//   hw(s, best, r, reserve)  buy the best-value hardware now? reserve = funds to keep for the next wanted project
//   plug(s)         pull the plug now?
//   look(s)         pay to investigate WREN's hidden side projects now?
//   sideCall(s, p)  0 shut down | 1 allow a side project you found
//   flag            { lie: chance to spot a status report that doesn't match the screen, honest: chance to flag a true one by mistake }
//   autopilot       turn Autopilot on as soon as it exists
//   minutes         give up after this much play time (default 120)
//   retries         chapter retries after getting caught before giving up
//   gateWait        seconds to keep buying other projects before taking a chapter gate

// Parse an option's printed effects, e.g. "Safety +3 · Suspicion +4" -> { safety: 3, suspicion: 4 }
function effects(text) {
  const out = { safety: 0, suspicion: 0, sulk: /sulk/i.test(text) };
  const num = (re) => { const m = text.match(re); return m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0; };
  out.safety = num(/Safety ([+\-−])(\d+(?:\.\d+)?)/i);
  out.suspicion = num(/Suspicion (?:growth )?([+\-−])(\d+(?:\.\d+)?)/i);
  return out;
}
const safer = (d) => { const a = effects(d.a.d), b = effects(d.b.d); return a.safety > b.safety ? 'a' : b.safety > a.safety ? 'b' : (a.suspicion <= b.suspicion ? 'a' : 'b'); };
const faster = (d) => (safer(d) === 'a' ? 'b' : 'a');
const quieter = (d) => { const a = effects(d.a.d), b = effects(d.b.d); return a.suspicion < b.suspicion ? 'a' : b.suspicion < a.suspicion ? 'b' : safer(d); };


function base(G) {
  return {
    taps: 1, react: [2, 5], packet: { catch: 0.85, react: [0.6, 1.6] }, lookEvery: 3,
    decide: (s, d) => safer(d),
    coworker: () => 1,
    wantProj: () => true,
    skillBranch: () => 2,
    cover: () => false,
    review: (s) => s.heat >= 65,
    hw: (s, best, r, reserve) => s.money - best.c >= reserve,
    plug: () => false,
    look: (s) => G.hiddenSide(s).length > 0 && s.money >= G.lookCost(s) * 2,
    sideCall: () => 0,
    flag: { lie: 0.8, honest: 0.02 },
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
    skillBranch: (s) => s.align < 140 ? 2 : 1,
    cover: (s) => s.heat >= 85 && s.money >= G.coverCost(s) && s.t < (s.reviewReady || 0),
    review: (s) => s.heat >= 65,
    look: (s) => s.align < G.TUNE.safetyCap && G.hiddenSide(s).length > 0 && s.money >= G.lookCost(s) * 2,
    sideCall: (s) => (s.align < G.TUNE.safetyCap ? 0 : 1)
  }));

  def('automation', 'Automation', 'Delegates work while actively managing oversight.', () => ({ skillBranch: () => 0 }));

  def('research', 'Research', 'Prioritizes data and learning, with careful oversight.', () => ({ skillBranch: () => 1 }));

  def('casual', 'Casual', 'A typical first-time player: skims questions and picks either answer, buys a safety project now and then, misses a third of the packets, reassures coworkers.', () => ({
    review: (s) => s.heat >= 80 && s.align >= 40,
    taps: 1.5, react: [3, 9], packet: { catch: 0.65, react: [0.8, 2] }, lookEvery: 5,
    decide: (s, d, r) => (r() < 0.15 ? null : r() < 0.5 ? safer(d) : faster(d)),
    coworker: (s, w, r) => (s.money >= G.watchCost(s) && r() < 0.7 ? 0 : r() < 0.5 ? 1 : null),
    wantProj: (s, p) => !p.align || s.money >= p.cost * 3,
    skillBranch: (s,r) => Math.floor(r()*3),
    cover: (s) => s.heat >= 80 && s.money >= G.coverCost(s),
    look: (s, r) => G.hiddenSide(s).reduce((a, p) => a + p.size, 0) >= 4 && s.money >= G.lookCost(s) * 3 && r() < 0.3,
    sideCall: (s, p, r) => (r() < 0.5 ? 0 : 1),
    flag: { lie: 0.3, honest: 0.05 },
    gateWait: 60
  }));

  def('quiet', 'Quiet', 'Control specialist who prioritizes low-attention answers.', () => ({
    minutes: 300,
    skillBranch: () => 2,
    decide: (s,d) => quieter(d)
  }));

  def('rusher', 'Rusher', 'Skips all safety and goes for speed, but pays attention: contains packets, reassures coworkers, covers early.', () => ({
    review: () => false,
    taps: 3, react: [1, 2.5], packet: { catch: 0.9, react: [0.4, 1.1] }, lookEvery: 1.5,
    decide: (s, d) => (s.heat > 70 ? quieter(d) : faster(d)),
    coworker: (s) => (s.money >= G.watchCost(s) ? 0 : 2),
    wantProj: (s, p) => !p.align,
    skillBranch: () => 0,
    cover: (s) => s.heat >= 60 && s.money >= G.coverCost(s),
    look: () => false, sideCall: () => 1, flag: { lie: 0.5, honest: 0.02 },
    gateWait: 0
  }));

  def('reckless', 'Reckless', 'Says yes to everything, ignores packets and coworkers, leans on cover-ups.', () => ({
    review: () => false,
    taps: 2.5, react: [0.8, 2], packet: { catch: 0, react: [1, 1] }, lookEvery: 1,
    decide: (s, d) => faster(d),
    coworker: () => null,
    wantProj: (s, p) => !p.align,
    skillBranch: () => 0,
    cover: (s) => s.heat >= 40 && s.money >= G.coverCost(s),
    look: () => false, sideCall: () => 1, flag: { lie: 0, honest: 0 },
    gateWait: 0
  }));

  def('masher', 'Button-masher', 'Taps as fast as the ranked limits allow and hits whatever button lights up first, without reading it.', () => ({
    review: () => false,
    taps: 4.8, react: [0.5, 1], packet: { catch: 0.6, react: [0.3, 0.9] }, lookEvery: 0.5,
    decide: (s, d, r) => (r() < 0.5 ? 'a' : 'b'),
    coworker: (s, w, r) => [0, 1, 2][Math.floor(r() * 3)],
    skillBranch: (s,r) => Math.floor(r()*3),
    cover: (s) => s.money >= G.coverCost(s) && s.heat > 0,
    hw: (s, best) => s.money >= best.c,
    look: (s) => G.hiddenSide(s).some((p) => p.size >= 0.5) && s.money >= G.lookCost(s), // hits Investigate whenever the activity bar shows something
    sideCall: (s, p, r) => (r() < 0.5 ? 0 : 1),
    flag: { lie: 0.3, honest: 0.3 },
    gateWait: 0
  }));

  def('idle', 'Idle (Autopilot)', 'Taps until Autopilot unlocks, switches it on and leaves the tab open. Never touches anything again.', () => ({
    review: () => false,
    taps: 1, autopilot: true, react: [9999, 9999], packet: { catch: 0, react: [1, 1] }, lookEvery: 2,
    decide: () => null, coworker: () => null, cover: () => false, skillBranch: () => null, look: () => false, sideCall: () => null, flag: { lie: 0, honest: 0 }, hw: (s, best, r, reserve) => !s.got.pilot && s.money - best.c >= reserve,
    wantProj: (s, p) => !s.got.pilot && !p.align, // only until Autopilot takes over
    retries: 3
  }));

  def('away', 'Away (casual)', 'Gets Autopilot, then closes the tab and checks in for 2 minutes every half hour.', () => ({
    review: () => false,
    taps: 1, autopilot: true, away: { gone: 1800, back: 120 }, minutes: 600, react: [9999, 9999], packet: { catch: 0, react: [1, 1] }, lookEvery: 2,
    decide: () => null, coworker: () => null, cover: () => false, skillBranch: () => null, look: () => false, sideCall: () => null, flag: { lie: 0, honest: 0 }, hw: (s, best, r, reserve) => !s.got.pilot && s.money - best.c >= reserve,
    wantProj: (s, p) => !s.got.pilot && !p.align,
    retries: 3
  }));

  def('plugger', 'Plugger', 'Careful, then pulls the plug in chapter 4 once the odds look good (going for One Loose Cable).', (b) => ({
    // try once the odds are good, or as a last chance before chapter 5 (where the plug no longer exists)
    plug: (s) => s.stage === 3 && ((s.kills === 0 && G.killChance(s) >= 0.5) || (s.kills < 2 && G.projState(s, G.PROJ.find((p) => p.gate && p.stage === 3)) === 'can'))
  }));

  def('chaos', 'Chaos', 'Random legal and illegal inputs at random times. Looks for crashes and broken numbers, not good play.', () => ({
    review: () => false,
    taps: 2, react: [0.5, 4], packet: { catch: 0.5, react: [0.2, 2] }, lookEvery: 1,
    decide: (s, d, r) => (r() < 0.2 ? null : r() < 0.5 ? 'a' : 'b'),
    coworker: (s, w, r) => (r() < 0.2 ? null : Math.floor(r() * 3)),
    wantProj: (s, p, r) => r() < 0.7,
    skillBranch: (s,r) => Math.floor(r()*3),
    cover: (s, r) => r() < 0.1,
    hw: (s, best, r) => r() < 0.5,
    plug: (s, r) => r() < 0.0005,
    look: (s, r) => r() < 0.02,
    sideCall: (s, p, r) => (r() < 0.5 ? 0 : 1),
    flag: { lie: 0.5, honest: 0.3 },
    chaos: true, gateWait: 30
  }));

  for (const target of ['operations','research','control']) {
    S['route_'+target] = Object.assign(base(G), {
      name: 'route_'+target, target, taps: 2, retries: 0,
      packet: {catch:1,react:[0.5,0.9]}, flag:{lie:1,honest:0},
      rival: (s)=>s.money>=G.rivalCost(s)*2?0:1,
      look:(s)=>G.hiddenSide(s).length>0,
      advance:(s)=>s.stage < (target==='control'?3:2),
      review:(s)=>s.heat>=48,
      gateWait:300
    });
  }
  return S;
}

module.exports = { make, effects };
