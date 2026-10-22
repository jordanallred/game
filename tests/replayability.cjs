const test = require('node:test');
const assert = require('node:assert/strict');
const {loadGame} = require('../sim/game.cjs');
const G = loadGame();
const setup = (mandate='operations', complication='none') => ({mandate,complication});
const fresh = (m='operations',c='none') => {const s=G.fresh(123,setup(m,c));s.started=true;return s;};
test('setup is validated and deterministic',()=>{
 assert.equal(typeof G.validateSetup,'function');
 for(const x of [null,[],{},setup('bad'),setup('research','bad'),{mandate:'research',complication:['budget','archive']}]) assert.equal(G.validateSetup(x),false);
 assert.equal(G.validateSetup(setup()),true);
 assert.deepEqual(fresh(),fresh());
});
test('mandates and complications change real resources and costs',()=>{
 const r=fresh('research'),o=fresh('oversight'),a=fresh(),b=fresh('operations','budget');
 assert.equal(r.data,600);assert.equal(r.m.algo,1.2);assert.equal(r.m.value,0.8);
 assert.equal(o.align,8);assert.equal(o.m.rate,0.85);assert.equal(a.m.value,1.15);
 assert.equal(G.hwCost(b,G.HW[0]),Math.ceil(G.hwCost(a,G.HW[0])*1.25));
 assert.equal(G.dpt(fresh('operations','archive')),G.dpt(a)*0.75);
 o.stage=2;a.stage=2;assert.equal(G.lookCost(o),Math.ceil(G.lookCost(a)*0.75));
 assert.ok(G.heatGain(fresh('operations','watchful'))>G.heatGain(fresh()));
 const loaded=JSON.parse(JSON.stringify(r));assert.equal(loaded.m.algo,1.2);
});
module.exports={fresh,setup};
function qualified(id){const s=fresh();s.stage=id==='control'?3:2;s.cap=750;s.align=110;s.heat=0;s.got.interp=s.got.redteam=true;s.revealed=3;s.researchShut=3;s.st.shut=3;s.skills={8:true,9:true};G.initWatch(s);Object.values(s.w).slice(0,3).forEach(w=>{w.st='ally';w.until=0;});return s;}
test('objectives require genuine conditions and stable hold periods',()=>{
 assert.equal(typeof G.routeStatus,'function');
 for(const [id,seconds] of [['operations',90],['research',0],['control',60]]){
 const s=qualified(id);assert.equal(G.routeStatus(s,id).eligible,true);assert.equal(G.routeStatus(s,id).ready,seconds===0);
 if(seconds){s.routes[id]=seconds-0.1;assert.equal(G.input(s,17,G.ROUTES.findIndex(r=>r.id===id)).ok,false);G.tick(s,0.1);assert.equal(G.routeStatus(s,id).ready,true);s.heat=100;assert.equal(G.input(s,17,G.ROUTES.findIndex(r=>r.id===id)).ok,false);}
 }
});
test('lost conditions reset holds; hidden work and pending questions block conclusions',()=>{
 const s=qualified('operations');s.routes.operations=40;s.sp=[{found:false,done:null}];G.updateRoutes(s,.1);assert.equal(s.routes.operations,0);assert.equal(G.routeStatus(s,'operations').eligible,false);
 s.sp=[];s.dec={};assert.equal(G.routeStatus(s,'research').ready,false);s.dec=null;s.offline=true;assert.equal(G.input(s,17,1).ok,false);
});
test('three conclusions use equal multipliers and cannot finish themselves',()=>{
 for(let i=0;i<3;i++){const id=['operations','research','control'][i],s=qualified(id);s.routes[id]=100;assert.equal(s.ended,null);assert.equal(G.input(s,17,i).ok,true);G.tick(s,.1);assert.equal(G.endingId(s),id);assert.equal(G.scoreParts(s).mult,1.5);assert.equal(G.input(s,17,i).ok,false);}
});
test('rivals are seeded, queued, capped and have an always affordable decline',()=>{
 assert.equal(typeof G.competitionTick,'function');
 const a=fresh(),b=fresh();a.stage=b.stage=1;G.competitionTick(a,0);G.competitionTick(b,0);assert.deepEqual(a.competition,b.competition);
 a.t=1000;a.inc={};G.competitionTick(a,0);assert.equal(a.competition.pending,null);a.inc=null;G.competitionTick(a,0);assert.ok(a.competition.pending);
 a.t+=1;const before=a.cap;assert.equal(G.input(a,18,0).ok,false);assert.equal(a.cap,before);assert.equal(G.input(a,18,2).ok,true);assert.equal(a.competition.precedent,.05);
 for(let stage=2;stage<=3;stage++){a.stage=stage;G.competitionTick(a,0);a.t+=1000;G.competitionTick(a,0);a.t+=31;G.competitionTick(a,0);}
 assert.equal(a.competition.history.length,3);a.t+=10000;G.competitionTick(a,0);assert.equal(a.competition.history.length,3);
});
test('discovery and personal bests are idempotent and separated by setup',()=>{
 assert.equal(typeof G.discoveryResult,'function');let r={};
 for(const [i,id] of ['operations','research','control'].entries()){const s=qualified(id);s.routes[id]=100;G.input(s,17,i);G.tick(s,.1);r=G.discoveryResult(r,s).records;assert.equal(r.routes[id],true);}
 assert.equal(Object.keys(r.unlocks).length,3);
 const s=qualified('research');G.input(s,17,1);G.tick(s,.1);const x=G.discoveryResult(r,s);assert.equal(x.newUnlock,null);assert.ok(G.recordKey(s).includes('operations'));
 assert.equal(Object.keys(G.normalizeDiscoveries('broken').routes).length,0);assert.equal(Object.keys(G.normalizeDiscoveries({routes:{unknown:true},bests:{x:NaN}}).routes).length,0);
});
test('replays reconstruct every setup and reject invalid setup metadata',()=>{
 for(const m of Object.keys(G.MANDATES))for(const c of Object.keys(G.COMPLICATIONS)){
 const config=setup(m,c),day='2026-10-22',s=G.fresh(G.daySeed(day),config);s.started=true;s.ranked=true;s.day=day;
 const taps=Array(120).fill(0);taps[0]=1;G.click(s);for(let i=0;i<taps.length;i++)G.tick(s,G.STEP);
 const rp=G.replayer(day,taps,[],0,config);assert.ok(rp.run(1000).done);assert.equal(JSON.stringify(rp.state()),JSON.stringify(s));
 }
 assert.throws(()=>G.replayer('2026-10-22',[],[],0,setup('bad')),/setup/i);
});
test('new casual saves load once and legacy saves stay legacy',()=>{
 assert.equal(typeof G.restoreCasual,'function');
 const s=fresh('research');s.m.algo=2;const r=G.restoreCasual(JSON.parse(JSON.stringify(s)));assert.equal(r.m.algo,2);assert.equal(r.setup.mandate,'research');
 const old=G.fresh(1);old.started=true;assert.equal(G.restoreCasual(old).runSchema,undefined);
});
test('failure wins on the tick and retry preserves setup without compounding',()=>{
 const s=qualified('operations');s.routes.operations=89.9;s.heat=99.99;s.aut=100;s.m.heatGain=100;G.tick(s,.1);assert.equal(s.ended.type,'caught');assert.equal(G.input(s,17,0).ok,false);
 const r=fresh('research');r.ended={type:'caught',stage:0};const retry=G.input(r,9,0).s;assert.equal(retry.setup.mandate,'research');assert.equal(retry.m.algo,1.2);
});
test('rival review cannot be evaded by a promotion or overlap a WREN decision',()=>{
 const s=fresh();s.stage=1;s.cap=1e6;s.money=1e12;s.competition.pending={stage:1,rival:'Vector',t0:0,dueAt:30};
 const gate=G.PROJ.find(p=>p.stage===1&&p.gate);for(const p of G.PROJ)if(p.stage<=1&&!p.gate)s.got[p.id]=true;
 assert.notEqual(G.projState(s,gate),'can');assert.equal(G.buyProj(s,gate.id,false),false);
});
test('reveals and shutdown evidence cannot be farmed by chapter retries',()=>{
 const s=fresh();s.stage=2;s.revealed=3;s.researchShut=3;s.st.shut=10;s.got.interp=s.got.redteam=true;s.cap=1000;s.align=100;
 assert.equal(G.routeStatus(s,'research').eligible,true);
 s.researchShut=0;assert.equal(G.routeStatus(s,'research').eligible,false);
});
test('live input-before-tick ordering gives scrutiny failure priority over a conclusion',()=>{
 const s=qualified('research');s.heat=99.999;s.aut=100;
 assert.equal(G.input(s,17,1).ok,true);G.tick(s,.1);assert.equal(s.ended.type,'caught');
});
test('a conclusion request cannot beat an ally breaking their promise on the same tick',()=>{
 const s=qualified('control');s.routes.control=60;
 const w=Object.values(s.w).find(x=>x.st==='ally');w.until=.05;w.need=10000;w.shutAt=s.st.shut;
 assert.equal(G.input(s,17,2).ok,true);G.tick(s,.1);assert.equal(s.ended,null);assert.equal(s.routes.control,0);
});
test('setup requirements include currently satisfied conditions',()=>{
 const st=G.routeStatus(fresh(),'operations');assert.ok(Array.isArray(st.requirements));assert.ok(st.requirements.includes('Scrutiny below 50%'));assert.ok(st.requirements.some(x=>/hidden work/.test(x)));
});
