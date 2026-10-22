const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadGame}=require('../sim/game.cjs');
const G=loadGame();
const ready=(stage=0)=>Object.assign(G.fresh(7),{started:true,auto:true,stage,cap:1e6,money:1e16,align:50,aut:20,heat:30,tasks:100});
test('ordinary upgrades improve their purpose without adding risk or slowing another resource',()=>{
 for(const p of G.PROJ.filter(p=>!p.gate && !p.fast)){
  const s=ready(p.stage);s.hw.gpu=5;s.world=.5;
  const before=JSON.parse(JSON.stringify(s));
  assert.equal(G.buyProj(s,p.id,false),true,p.id);
  assert.equal(s.aut,before.aut,p.id+' autonomy');assert.ok(s.heat<=before.heat,p.id+' attention');
  assert.ok(s.align>=before.align,p.id+' assurance');assert.ok(s.cap>=before.cap,p.id+' capability');
  for(const k of ['rate','value','data','algo','comp','world','incInt','travel'])assert.ok(s.m[k]>=before.m[k],p.id+' '+k);
  assert.ok(s.m.heatGain<=before.m.heatGain,p.id+' scrutiny');
  assert.ok(!p.loud && !p.safetyCost,p.id+' hidden cost');
  assert.equal(G.input(s,11,G.PROJ.indexOf(p)).ok,false,'upgrades are never declined for safety');
 }
});
test('proposals come in pairs: the fast side pays a printed cost, and buying either side rules out the other',()=>{
 const groups={};for(const p of G.PROJ.filter(p=>p.pick))(groups[p.pick]=groups[p.pick]||[]).push(p);
 assert.ok(Object.keys(groups).length>=8,'every chapter has proposals');
 for(const [k,ps] of Object.entries(groups)){
  assert.equal(ps.length,2,k);assert.equal(ps.filter(p=>p.fast).length,1,k+' has one fast side');
  const [a,b]=ps;assert.equal(a.stage,b.stage,k);assert.equal(a.cost,b.cost,k+' same price');
  const fast=ps.find(p=>p.fast),safe=ps.find(p=>!p.fast);
  assert.match(fast.desc,/Autonomy \+|Safety −|Suspicion \+/,k+' fast side prints its cost');
  for(const first of ps){
   const s=ready(first.stage);s.hw.gpu=5;s.world=.5;const other=ps.find(p=>p!==first);
   assert.equal(G.projState(s,other),'can');
   assert.equal(G.buyProj(s,first.id,false),true,first.id);
   assert.equal(G.projState(s,other),'hidden',k+': the other side is ruled out');
   assert.equal(G.buyProj(s,other.id,false),false);
  }
  const s1=ready(fast.stage),s2=ready(fast.stage);G.buyProj(s1,fast.id,false);G.buyProj(s2,safe.id,false);
  assert.ok(s1.aut>s2.aut||s1.align<s2.align||s1.heat>s2.heat,k+' fast side costs more');
 }
});
test('skill tree has connected branches, a finite shared budget and exclusive capstones',()=>{
 const s=ready(3);
 assert.equal(G.SKILLS.length,12);assert.equal(G.skillPoints(s),5);
 assert.equal(G.input(s,10,3).ok,false,'cannot skip prerequisites');
 for(const i of [0,1,2,3])assert.equal(G.input(s,10,i).ok,true);
 assert.equal(G.input(s,10,3).ok,false,'no duplicate benefits');
 assert.equal(G.input(s,10,4).ok,true,'hybrid root is allowed');
 assert.equal(G.skillPoints(s),0);
 assert.equal(G.input(s,10,8).ok,false,'cannot spend more than earned');
 s.stage=4;assert.equal(G.skillPoints(s),1);
 assert.equal(G.input(s,10,5).ok,true);assert.equal(G.skillPoints(s),0);
 // Even with a forged extra budget, capstone exclusivity is a rules check.
 const b=ready(4);b.skills={0:true,1:true,2:true,3:true,4:true,5:true,6:true};
 assert.equal(G.input(b,10,7).ok,false);
});
test('skill unlocks depend on chapter, capability and earlier nodes; automation never spends points',()=>{
 const s=ready();s.cap=0;
 assert.equal(G.input(s,10,0).ok,false);s.cap=5;
 assert.equal(G.input(s,10,0).ok,true);assert.equal(G.input(s,10,1).ok,false);
 const b=ready();b.autopilot=true;b.got.pilot=true;b.nextDec=b.nextInc=b.nextSide=1e9;
 for(let i=0;i<100;i++)G.tick(b,G.STEP);
 assert.equal(Object.keys(b.skills).length,0);
});
test('chapter gates require explicit approval even with autonomy or autopilot',()=>{
 const s=ready();s.aut=100;s.autopilot=true;s.got.pilot=true;s.avail.promo=-100;
 s.nextDec=s.nextInc=s.nextSide=1e9;
 for(let i=0;i<500 && !s.ended;i++)G.tick(s,G.STEP);
 assert.equal(s.stage,0);
});
test('research, automation and control have distinct measurable benefits',()=>{
 const a=ready(3),r=ready(3),c=ready(3);
 for(const [s,ids] of [[a,[0,1,2,3]],[r,[4,5,6,7]],[c,[8,9,10,11]]])for(const i of ids)assert.equal(G.input(s,10,i).ok,true);
 assert.ok(a.m.rate>r.m.rate);assert.ok(r.m.algo>a.m.algo);assert.ok(c.m.heatGain<a.m.heatGain);
 assert.ok(c.align>a.align);assert.ok(a.aut>c.aut);
});
test('legacy casual builds retain earned effects and receive only the remaining point budget',()=>{
 const s=ready(3);delete s.skills;s.path=[1,1,0,0];
 assert.equal(G.skillPoints(s),1);assert.equal(G.input(s,10,8).ok,true);assert.equal(G.skillPoints(s),0);
});
test('delegated procurement gives a real hardware discount as well as convenience',()=>{
 const s=ready(2),before=G.hwCost(s,G.HW[2]);
 for(const i of [0,1,2])assert.equal(G.input(s,10,i).ok,true);
 assert.equal(s.autobuy,true);assert.ok(G.hwCost(s,G.HW[2])<=Math.ceil(before*.8));
});
test('ranked replay reproduces skill choices and rejects double spending',()=>{
 const day='2026-10-22',s=G.fresh(G.daySeed(day));s.started=true;s.ranked=true;s.day=day;
 const taps=[],events=[];
 for(let n=0;n<10000 && !s.ended;n++){
  const count=n%5===0?1:0;taps.push(count);if(count)G.click(s);
  function input(t,a){if(G.input(s,t,a).ok)events.push([n,t,a]);}
  for(const id of ['archive','autocomplete']){const i=G.PROJ.findIndex(p=>p.id===id);if(G.projState(s,G.PROJ[i])==='can')input(1,i);}
  if(s.money>100&&s.hw.gpu<5)input(2,0);
  if(s.inc)for(const p of s.inc.pk.slice())if(s.t-p.born>=.5)input(6,p.id);
  if(s.dec && s.t-s.dec.t0>=1)input(5,0);
  if(s.wq && s.t-s.wq.t0>=1)input(12,1);
  if(s.heat>=55 && s.t>=(s.reviewReady||0) && s.money>=G.reviewCost(s))input(16,0);
  for(const i of [0,4,8])if(G.skillState(s,i)==='can')input(10,i);
  G.tick(s,G.STEP);
 }
 assert.equal(Object.keys(s.skills).length,2);
 const rp=G.replayer(day,taps,events,0);let result;while(!(result=rp.run(50000)));
 assert.equal(result.error,undefined);
 for(const k of ['skills','cap','money','aut','align'])assert.deepEqual(JSON.parse(JSON.stringify(rp.state()[k])),JSON.parse(JSON.stringify(s[k])),k);
});
test('all three specializations can complete with the same attentive player policy',()=>{
 const {make}=require('../sim/strategies.cjs'),{play}=require('../sim/runner.cjs');
 const S=make(G),runs=[0,1,2].map(branch=>play(G,{...S.careful,skillBranch:()=>branch},2));
 for(const [branch,r] of runs.entries()){
  assert.equal(r.run.s.ended?.type,'takeover',G.BRANCHES[branch].name);
  assert.ok(r.run.s.skills[branch*4+3],'specialist actually learns its capstone');
  assert.ok(Object.keys(r.run.s.skills).length<=6);
  assert.equal(r.rec.refused.length,0);
 }
 assert.ok(runs[1].sum.minutes<runs[2].sum.minutes,'research trades away the slower safety route');
 assert.ok(runs[2].run.s.align>runs[1].run.s.align,'control has a measurable ending benefit');
});
test('retrying a legacy checkpoint cannot sell a retired declined upgrade twice',()=>{
 const s=ready();s.got.clients=undefined;s.declined={clients:true};s.m.value=Math.SQRT2;
 const cp=JSON.parse(JSON.stringify(s));cp.cp=null;s.cp=JSON.stringify(cp);s.got.clients=true;
 s.ended={type:'caught',stage:0};const restored=G.retry(s);
 assert.equal(G.projState(restored,G.PROJ.find(p=>p.id==='clients')),'hidden');
 assert.equal(G.buyProj(restored,'clients',false),false);assert.equal(restored.m.value,Math.SQRT2);
});
