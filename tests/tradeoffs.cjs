const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadGame } = require('../sim/game.cjs');
const G = loadGame();
function state(stage=0) { const s=G.fresh(3); Object.assign(s,{started:true,auto:true,stage,money:1e12,cap:100,align:100,aut:50,heat:40}); return s; }

test('perfect containment prevents escapes but does not erase compliance evidence or create safety',()=>{
 const s=state(); const heat=s.heat, safety=s.align;
 s.inc={id:1,n:1,done:0,ok:0,pk:[{id:1,born:s.t-1}]};
 assert.equal(G.input(s,6,1).ok,true);
 assert.ok(s.heat>=heat,'containment is not a suspicion refund');
 assert.equal(s.align,safety,'cleaning up WREN is not safety research');
});
test('an outbreak creates attention even when every packet can be contained',()=>{
 const s=state(); s.nextInc=0; s.nextDec=1e9;
 G.tick(s,0.1);
 assert.ok(s.inc); assert.ok(s.heat>=44,'an incident itself leaves evidence');
});
test('cover-ups sacrifice safety and permanently worsen scrutiny before autonomy is maxed',()=>{
 const s=state(); const gain=G.heatGain(s), safety=s.align;
 assert.equal(G.cover(s),true);
 assert.ok(s.align<safety); s.aut=50;
 assert.ok(G.heatGain(s)>gain,'lasting pressure cannot be paid away');
});
test('manual approvals cannot cancel passive scrutiny by mashing',()=>{
 const s=state(3); const heat=s.heat;
 for(let i=0;i<100;i++) G.click(s);
 assert.equal(s.heat,heat);
});
test('repeatable shutdown work has a run-wide safety budget, including across chapters',()=>{
 const s=state(); s.align=0;
 for(let i=0;i<40;i++) { s.sp.push({id:i+1,i:0,size:5,found:true,done:null}); assert.equal(G.input(s,14,(i+1)*2).ok,true); if(i===19) s.stage=1; }
 assert.ok(s.align<=12,'side projects cannot farm a maxed safety score');
});
test('every decision option changes something beneficial and pays a tangible cost',()=>{
 const value=s=>[s.money,s.data,s.cap,s.align,s.m.value,s.m.rate,s.m.data,s.m.algo,s.m.comp,s.m.incInt,s.m.travel,-s.heat,-s.aut];
 for(const [i,d] of G.DEC.entries()) for(const k of ['a','b']) {
  const s=state(d.stage); s.world=0.5; const before=value(s), world=s.m.world, sulk=s.sulk, scrutiny=s.m.heatGain;
  d[k].eff(s); const after=value(s);
  const benefit=after.some((v,j)=>v>before[j]) || s.m.world>world;
  const cost=after.some((v,j)=>v<before[j]) || s.sulk>sulk || s.m.world<world || s.m.heatGain>scrutiny;
  assert.ok(benefit,`decision ${i} ${k}: must have a benefit`); assert.ok(cost,`decision ${i} ${k}: must have a cost`);
 }
});
test('even a heavily audited program retains scrutiny at high autonomy',()=>{
 const s=state(3); s.align=150;s.aut=100;s.m.heatGain=0.1;s.m.heatDecay=1.6;
 assert.ok(G.heatGain(s)>G.heatDecay(s),'stacking safety and oversight must not switch compliance off');
});
test('taking longer always costs score, including after seventy minutes',()=>{
 const s=state(4);s.ended={type:'takeover'};s.cap5=10000;s.clock=75*60;
 const first=G.score(s); s.clock=110*60;
 assert.ok(G.score(s)<first,'safety delays cannot become free after the score floor');
});
test('real containment work fulfils an ally promise after shutdown safety rewards are exhausted',()=>{
 const s=state(); G.initWatch(s); s.t=1;s.wq={id:'kevin',t0:0,dur:20};
 s.sideSafety=G.TUNE.sideSafetyMax;s.st.shut=6;
 assert.equal(G.input(s,12,1).ok,true);
 s.sp=[{id:1,i:0,size:2,found:true}];
 assert.equal(G.input(s,14,2).ok,true);
 G.tick(s,.1);
 assert.equal(s.w.kevin.until,0,'actual safety work must count without farming points');
 assert.equal(s.w.kevin.st,'ally');
});
test('a funded containment protocol reduces the damage of a packet that escapes',()=>{
 function escape(protocol) { const s=state(2);s.heat=0;if(protocol)s.got.contain=true;s.inc={id:1,n:1,spawned:1,done:0,ok:0,travel:1,next:99,pk:[{id:1,born:-2}]};G.tick(s,.1);return s.heat; }
 assert.ok(escape(true)<escape(false));
});
test('independent review trades capability, funds and speed for attention relief without safety farming',()=>{
 const s=state(2);const before={cap:s.cap,money:s.money,safety:s.align,heat:s.heat};
 assert.equal(G.input(s,16,0).ok,true);
 assert.ok(s.cap<before.cap && s.money<before.money && s.sulk>0);
 assert.ok(s.heat<before.heat);assert.equal(s.align,before.safety);
 assert.equal(G.input(s,16,0).ok,false,'review has a cooldown');
 s.stage=4;s.reviewReady=0;assert.equal(G.input(s,16,0).ok,false);
});
test('allowing a side project still has a lasting cost at maximum autonomy',()=>{
 const s=state(3);s.aut=100;s.sp=[{id:1,i:0,size:3,found:true}];
 const before=G.heatGain(s);assert.equal(G.input(s,14,3).ok,true);
 assert.ok(G.heatGain(s)>before);
});
test('independent operations spends assurance and creates autonomy through a deliberate skill choice',()=>{
 const s=state(3);s.cap=3000;const before=s.align,aut=s.aut;
 for(const i of [0,1,2,3])assert.equal(G.input(s,10,i).ok,true);
 assert.ok(s.align<before);assert.ok(s.aut>aut);
 assert.match(G.SKILLS[3].desc,/safety −8/);
});

test('ranked replay reproduces independent reviews and their costs exactly',()=>{
 const day='2026-10-22', s=G.fresh(G.daySeed(day));s.started=true;s.ranked=true;s.day=day;
 const taps=[],events=[];let reviewed=0;
 for(let n=0;n<3000;n++) {
  const count=n%10===0?1:0;taps.push(count);if(count)G.click(s);
  const input=(type,arg)=>{const r=G.input(s,type,arg);if(r.ok)events.push([n,type,arg]);return r.ok;};
  for(const id of ['archive','autocomplete']){const i=G.PROJ.findIndex(p=>p.id===id);if(G.projState(s,G.PROJ[i])==='can')input(1,i);}
  if(s.money>500 && s.hw.gpu<6)input(2,0);
  if(s.auto && s.heat>5 && s.t>=(s.reviewReady||0) && s.money>=G.reviewCost(s))if(input(16,0))reviewed++;
  G.tick(s,G.STEP);
 }
 assert.ok(reviewed>0,'fixture must exercise input 16');
 const replay=G.replayer(day,taps,events,0);let result;while(!(result=replay.run(50000)));
 assert.equal(result.error,undefined);
 for(const key of ['cap','money','heat','align','sulk','reviewReady','riskyDecisions'])assert.equal(replay.state()[key],s[key],key);
 assert.equal(replay.state().st.reviews,s.st.reviews);
});
test('retry does not fulfil an ally promise using a shutdown that the checkpoint rewound',()=>{
 const s=state();G.initWatch(s);s.t=1;s.wq={id:'kevin',t0:0,dur:20};
 assert.equal(G.input(s,12,1).ok,true);
 const cp=JSON.parse(JSON.stringify(s));cp.cp=null;s.cp=JSON.stringify(cp);
 s.sp=[{id:1,i:0,size:2,found:true}];assert.equal(G.input(s,14,2).ok,true);
 s.ended={type:'caught',stage:0};const retried=G.retry(s);G.tick(retried,.1);
 assert.ok(retried.w.kevin.until>0,'the restored promise still needs actual work');
});
test('simulation offers only affordable, ready compliance responses',()=>{
 const {make}=require('../sim/strategies.cjs');const {createRun,step}=require('../sim/runner.cjs');
 for(const cooldown of [0,999]){
  const choices=[];const P={...make(G).careful,cover:()=>false,review:()=>true};
  const run=createRun(G,P,1,{onChoice(r,c){if(c.kind==='response')choices.push(c.options);}});
  Object.assign(run.s,{auto:true,cap:10,heat:70,money:2000,prN:8,prReady:cooldown});
  step(run);
  assert.ok(choices.every(options=>!options.includes('cover')),'unaffordable/cooling cover-up is not an alternative');
  assert.ok(run.s.reviewReady>0,'the eligible review was actually performed');
 }
});
test('additional oversight still reduces exposure after several safeguards are installed',()=>{
 const s=state(3);s.cap=4000;s.m.heatGain=0.1;
 const before=G.heatGain(s);assert.equal(G.buyProj(s,'paper',false),true);
 assert.ok(G.heatGain(s)<before,'oversight has diminishing returns rather than a dead purchase');
});
test('simulated players discard stale status flags after crossing into the world chapter',()=>{
 const {make}=require('../sim/strategies.cjs');const {createRun,step}=require('../sim/runner.cjs');
 const run=createRun(G,make(G).plugger,2);run.s.stage=4;run.s.auto=true;
 run.s.log=[{id:1,chk:true,t:0}];run.bot.flags={1:{go:true,at:0}};run.bot.lastMsg=1;
 step(run);assert.equal(run.rec.refused.length,0);
});
