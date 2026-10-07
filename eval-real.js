// Evaluate the Unified Decision Engine on downloaded data.
// Usage: node tools/eval-real.js --dir data --cost 10 --out report
require('../decision-engine.js');
const E=globalThis.UnifiedDecisionEngine,fs=require('fs'),path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const dir=arg('dir','data'),cost=+arg('cost',10),outDir=arg('out','report');
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')):[];
if(!files.length){console.error('No data files in '+dir+'. Run tools/fetch-binance.js first.');process.exit(1);}
const f=(x,n=2)=>Number.isFinite(x)?x.toFixed(n):(x===Infinity?'inf':'-');
const rows=[];
for(const file of files){
  const d=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));const sets={H1:d.H1,D1:d.D1};
  if((d.H1||[]).length<1500||(d.D1||[]).length<400){console.log('SKIP '+d.symbol+' (not enough candles)');continue;}
  let fin;try{fin=E.finalizeCurrent(sets);}catch(e){console.log('SKIP '+d.symbol+': '+e.message);continue;}
  const pwf=E.purgedWalkForward(sets,'H1',cost);
  for(const side of [1,-1]){
    const h=side===1?pwf.long:pwf.short,ex=E.executionValidation(sets,'H1',cost,pwf,side,{...fin.H1,side});
    const dirPass=h.n>=50&&h.acc>=.55&&h.pf>=1.2&&h.wilson>=.50;
    rows.push({symbol:d.symbol,side:side===1?'LONG':'SHORT',candles:d.H1.length,from:new Date(d.H1[0].time).toISOString().slice(0,10),
      currentSide:fin.H1.side===side?'ACTIVE':'-',techScore:+fin.H1.score.toFixed(1),
      dirN:h.n,dirAcc:h.acc,dirPF:h.pf,dirWilson:h.wilson,dirAvgR:h.avgR,dirPass,
      exN:ex.stats?.resolved||0,exPF:ex.stats?.pf||0,exAvgR:ex.stats?.avgR||0,exWilson:ex.stats?.wilson||0,
      foldPass:!!ex.foldPass,regime:ex.regimeState,regimeBasis:ex.regimeBasis,globalPass:!!ex.globalPass,hardPass:!!ex.hardPass,both:dirPass&&!!ex.hardPass});
  }
}
// ---- summary with multiple-testing awareness ----
const N=rows.length,cnt=g=>rows.filter(g).length;
function binomTail(n,k,p){let s=0;for(let i=k;i<=n;i++){let c=1;for(let j=1;j<=i;j++)c*=(n-i+j)/j;s+=c*Math.pow(p,i)*Math.pow(1-p,n-i);}return s;}
const NULL={globalPass:0.023,hardPass:0.003}; // measured on 300 random-walk hypotheses (see tests/)
const gP=cnt(r=>r.globalPass),hP=cnt(r=>r.hardPass),bP=cnt(r=>r.both),dP=cnt(r=>r.dirPass);
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,a.length-1));};
const pooled=rows.filter(r=>r.exN>=20).map(r=>r.exAvgR),tstat=pooled.length>1?mean(pooled)/(sd(pooled)/Math.sqrt(pooled.length)):0;
const lines=[];const P=s=>{console.log(s);lines.push(s);};
P(`# Real-data evaluation — cost ${cost} bps round-trip, H1 + D1 context`);P('');
P('| Symbol | Side | Active now | Dir N | Dir acc | Dir PF | Dir Wilson | Exec N | Exec PF | Exec avgR | Fold | Regime | Dir pass | Hard pass |');P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for(const r of rows)P(`| ${r.symbol} | ${r.side} | ${r.currentSide} | ${r.dirN} | ${f(r.dirAcc*100,1)}% | ${f(r.dirPF)} | ${f(r.dirWilson*100,1)}% | ${r.exN} | ${f(r.exPF)} | ${f(r.exAvgR,3)} | ${r.foldPass?'✓':'✗'} | ${r.regime} | ${r.dirPass?'✓':'✗'} | ${r.hardPass?'✓':'✗'} |`);
P('');P('## Summary');
P(`- Hypotheses tested (symbol × side): **${N}**`);
P(`- Directional gate passed: ${dP}; execution global gate passed: ${gP}; full hard gate passed: ${hP}; both layers: ${bP}`);
P(`- Expected by pure chance (random-walk calibration): execution-global ≈ ${(N*NULL.globalPass).toFixed(1)}, hard ≈ ${(N*NULL.hardPass).toFixed(1)}`);
if(N)P(`- P(≥${gP} execution passes by chance) = ${binomTail(N,gP,NULL.globalPass).toExponential(2)}; P(≥${hP} hard passes by chance) = ${binomTail(N,hP,NULL.hardPass).toExponential(2)}`);
P(`- Pooled mean execution expectancy across ${pooled.length} hypotheses: **${f(mean(pooled),3)}R** (t = ${f(tstat,2)}; |t|<2 ⇒ no reliable edge)`);
const L=rows.filter(r=>r.side==='LONG'&&r.exN>=20).map(r=>r.exAvgR),S=rows.filter(r=>r.side==='SHORT'&&r.exN>=20).map(r=>r.exAvgR);
P(`- Long avgR ${f(mean(L),3)}R vs Short avgR ${f(mean(S),3)}R (a large gap usually reflects the market's drift in the sample, not signal skill)`);
P('');P('Reading guide: passing counts near the "expected by chance" numbers = no evidence of edge. Treat any pass as a candidate for forward paper-testing, not as proof.');
fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'report.md'),lines.join('\n'));fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(rows,null,1));
