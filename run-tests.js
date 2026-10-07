// Automated regression suite for Unified Decision Engine.  Run:  node tests/run-tests.js
// Uses deterministic synthetic markets (no network). Exit code 1 on any failure.
const {E,buildSets}=require('./helpers.js');
let pass=0,fail=0;
const ok=(name,cond,info='')=>{cond?pass++:fail++;console.log((cond?'PASS  ':'FAIL  ')+name+(info?'  — '+info:''));};

// 1) Math primitives
ok('Wilson(55/100) ≈ 0.4524',Math.abs(E.wilsonLower95(55,100)-0.4524)<0.002);
ok('Wilson effective-N is wider than nominal',E.wilsonLowerEff(55,100,4)<E.wilsonLower95(55,100));
const flat=Array.from({length:50},(_,i)=>({high:101,low:99,close:100,open:100,volume:1,time:i,closeTime:i}));
ok('ATR on constant 2-wide candles = 2',Math.abs(E.atr(flat).at(-1)-2)<1e-9);

// 2) No look-ahead
const S=buildSets(7);let diffs=0,checked=0;
for(const i of [3600,3700,3800,3900]){
  const a=E.historicalSnapshot(S,'H1',i),b=E.historicalSnapshot({H1:S.H1.slice(0,i+1),D1:S.D1},'H1',i);
  if(a&&b){checked++;if(Math.abs(a.a.score-b.a.score)>1e-9)diffs++;}
}
ok('Snapshot independent of future H1 bars',checked>0&&diffs===0,`checked=${checked}`);
let bad=0;for(let i=3500;i<3990;i+=7){const s=E.historicalSnapshot(S,'H1',i);if(s&&S.D1[s.idx.D1].closeTime>S.H1[i].closeTime)bad++;}
ok('D1 context is always a CLOSED day',bad===0);

// 4) Null-market behaviour (random walk, zero edge) — false-positive control
let hyp=0,execGlobal=0,hard=0,sumR=0,nR=0;
for(let s=1;s<=40;s++){
  const M=buildSets(9000+s,{phi:0});const fin=E.finalizeCurrent(M),pwf=E.purgedWalkForward(M,'H1',10);
  for(const side of [1,-1]){
    const ex=E.executionValidation(M,'H1',10,pwf,side,{...fin.H1,side});hyp++;
    if(ex.globalPass)execGlobal++;if(ex.hardPass)hard++;
    if(ex.available&&ex.stats.resolved>=20){sumR+=ex.stats.avgR;nR++;}
  }
}
ok('Null market: execution-gate false-positive rate ≤ 8%',execGlobal/hyp<=0.08,`${execGlobal}/${hyp}`);
ok('Null market: HARD pass rate ≤ 2%',hard/hyp<=0.02,`${hard}/${hyp}`);
ok('Simulator has no upward bias (mean R < +0.05)',nR>0&&sumR/nR<0.05,`meanR=${(sumR/nR).toFixed(3)}`);
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
