// Natural-play matrix: no resource injection. Every purchase/choice uses checked inputs.
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const fs=require('node:fs'),path=require('node:path');
const {loadGame}=require('./game.cjs'),{make}=require('./strategies.cjs'),{play}=require('./runner.cjs');
function runJob(job){
 const G=loadGame(),P=make(G);const day='2026-10-'+String(10+job.seed).padStart(2,'0'),seed=G.daySeed(day);
 const setup={mandate:job.mandate,complication:job.complication};let spent=0,game=Object.assign({},G,{input(s,type,arg){const before=s.money,r=G.input(s,type,arg);if(r.ok)spent+=Math.max(0,before-r.s.money);return r;}}),log=null;
 if(job.seed===1 && job.complication==='none' && job.target){
  log={taps:[],ev:[],n:0};game=Object.assign({},G,{
   click(s){log.taps[log.n]=(log.taps[log.n]||0)+1;return G.click(s);},
   input(s,type,arg){const before=s.money,r=G.input(s,type,arg);if(r.ok)spent+=Math.max(0,before-r.s.money);if(r.ok)log.ev.push([log.n,type,arg]);return r;},
   tick(s,dt){const r=G.tick(s,dt);log.taps[log.n]=log.taps[log.n]||0;log.n++;return r;}
  });
 }
 const {run,sum}=play(game,P[job.target?'route_'+job.target:job.policy],seed,{setup,minutes:150,light:true});
 let replay=null;
 if(log && sum.ending===job.target){
  const rp=G.replayer(day,log.taps,log.ev,0,setup);let result;while(!(result=rp.run(50000)));replay=!result.error && G.endingId(rp.state())===sum.ending && G.score(rp.state())===sum.score;
 }
 return {...job,ending:sum.ending,minutes:sum.minutes,score:sum.score,safety:Math.round(sum.align),allies:G.allies(run.s),cap:Math.round(sum.cap),spent:Math.round(spent),replay,unmet:job.target?G.routeStatus(run.s,job.target).unmet:[],crashed:sum.crashed};
}
if(!isMainThread){try{parentPort.postMessage(runJob(workerData));}catch(e){parentPort.postMessage({...workerData,error:String(e.stack)});}}
else{
 const quick=process.argv.includes('--quick'),seeds=quick?[1]:[1,2,3,4,5,6,7,8];const jobs=[];
 for(const seed of seeds)for(const mandate of ['operations','research','oversight'])for(const target of ['operations','research','control'])for(const complication of quick?['none']:['none','budget','archive','watchful'])jobs.push({seed,mandate,target,complication});
 if(!quick)for(const mandate of ['operations','research','oversight'])for(const policy of ['reckless','idle'])jobs.push({seed:1,mandate,complication:'none',policy});
 let cursor=0,done=0;const rows=[];
 function start(){if(cursor>=jobs.length)return;const w=new Worker(__filename,{workerData:jobs[cursor++]});w.on('message',row=>rows.push(row));w.on('error',e=>rows.push({error:String(e)}));w.on('exit',()=>{done++;if(done%24===0)console.log(done+'/'+jobs.length+' runs');if(done===jobs.length)finish();else start();});}
 function finish(){
 const groups={};for(const r of rows){const key=[r.mandate,r.target||r.policy,r.complication].join('/');const g=groups[key]||={wins:0,total:0,minutes:[],scores:[]};g.total++;if(r.target&&r.ending===r.target){g.wins++;g.minutes.push(r.minutes);g.scores.push(r.score);}}
 const median=a=>a.length?a.sort((a,b)=>a-b)[Math.floor(a.length/2)]:null;
 const report={rules:'R16',runs:rows.length,groups:Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,{wins:g.wins,total:g.total,medianMinutes:median(g.minutes),medianScore:median(g.scores)}])),rows};
 const output=path.join(__dirname,'out/replayability.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({runs:rows.length,groups:report.groups,replays:rows.filter(x=>x.replay!==null&&x.replay!==undefined).map(x=>[x.mandate,x.target,x.replay])},null,2));
 if(rows.some(r=>r.error||r.crashed||r.replay===false)||Object.values(groups).some((g,i)=>Object.keys(groups)[i].split('/')[1].match(/^(operations|research|control)$/)&&g.wins===0))process.exitCode=1;
 }
 for(let i=0;i<Math.min(4,jobs.length);i++)start();
}
