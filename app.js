const $=id=>document.getElementById(id);
let deferredPrompt=null,mode='crypto';

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
  const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.3.0',{updateViaCache:'none'});
  await reg.update();
}catch(e){console.warn(e);}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden');});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden');};

document.querySelectorAll('.modeTab').forEach(b=>b.onclick=()=>{
  mode=b.dataset.mode;
  document.querySelectorAll('.modeTab').forEach(x=>x.classList.toggle('active',x===b));
  $('cryptoControls').classList.toggle('hidden',mode!=='crypto');
  $('forexControls').classList.toggle('hidden',mode!=='forex');
});

const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const fmt=(x,n=2)=>Number.isFinite(x)?Number(x).toFixed(n):'N/A';
const pct=x=>Number.isFinite(x)?`${(x*100).toFixed(2)}%`:'N/A';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;const k=2/(p+1);let z=mean(v.slice(0,p));o[p-1]=z;for(let i=p;i<v.length;i++){z=v[i]*k+z*(1-k);o[i]=z;}return o;}
function sma(v,p){const o=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)o[i]=s/p;}return o;}
function rsi(c,p=14){const o=Array(c.length).fill(null);if(c.length<=p)return o;const g=[],l=[];for(let i=1;i<c.length;i++){const d=c[i]-c[i-1];g.push(Math.max(d,0));l.push(Math.max(-d,0));}let ag=mean(g.slice(0,p)),al=mean(l.slice(0,p));const f=()=>al===0?100:100-100/(1+ag/al);o[p]=f();for(let i=p+1;i<c.length;i++){ag=(ag*(p-1)+g[i-1])/p;al=(al*(p-1)+l[i-1])/p;o[i]=f();}return o;}
function atr(cs,p=14){const tr=cs.map((c,i)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-cs[i-1].close),Math.abs(c.low-cs[i-1].close)));const o=Array(cs.length).fill(null);if(cs.length<p)return o;let x=mean(tr.slice(0,p));o[p-1]=x;for(let i=p;i<cs.length;i++){x=(x*(p-1)+tr[i])/p;o[i]=x;}return o;}
function wilder(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let s=v.slice(0,p).reduce((a,b)=>a+b,0);o[p-1]=s;for(let i=p;i<v.length;i++){s=s-s/p+(v[i]||0);o[i]=s;}return o;}
function adx(cs,p=14){const n=cs.length,pd=Array(n).fill(0),md=Array(n).fill(0),tr=Array(n).fill(0);for(let i=1;i<n;i++){const up=cs[i].high-cs[i-1].high,dn=cs[i-1].low-cs[i].low;pd[i]=up>dn&&up>0?up:0;md[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(cs[i].high-cs[i].low,Math.abs(cs[i].high-cs[i-1].close),Math.abs(cs[i].low-cs[i-1].close));}const t=wilder(tr.slice(1),p),pp=wilder(pd.slice(1),p),mm=wilder(md.slice(1),p),plus=Array(n).fill(null),minus=Array(n).fill(null),dx=Array(n).fill(null),ao=Array(n).fill(null);for(let j=p-1;j<t.length;j++){const i=j+1;if(!t[j])continue;plus[i]=100*pp[j]/t[j];minus[i]=100*mm[j]/t[j];const den=plus[i]+minus[i];dx[i]=den?100*Math.abs(plus[i]-minus[i])/den:0;}const vals=[],idx=[];for(let i=0;i<n;i++)if(dx[i]!==null){vals.push(dx[i]);idx.push(i);}if(vals.length>=p){let a=mean(vals.slice(0,p));ao[idx[p-1]]=a;for(let k=p;k<vals.length;k++){a=(a*(p-1)+vals[k])/p;ao[idx[k]]=a;}}return{adx:ao,plus,minus};}
function macd(c){const f=ema(c,12),s=ema(c,26),line=c.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),compact=line.filter(x=>x!=null),sigc=ema(compact,9),signal=Array(c.length).fill(null);let j=0;for(let i=0;i<c.length;i++)if(line[i]!=null)signal[i]=sigc[j++]??null;return{line,signal,hist:line.map((x,i)=>x!=null&&signal[i]!=null?x-signal[i]:null)};}
function ichimoku(cs){const mid=(i,p)=>{if(i<p-1)return null;let hi=-Infinity,lo=Infinity;for(let j=i-p+1;j<=i;j++){hi=Math.max(hi,cs[j].high);lo=Math.min(lo,cs[j].low);}return(hi+lo)/2;};const t=[],k=[],a=[],b=[];for(let i=0;i<cs.length;i++){const x=mid(i,9),y=mid(i,26);t.push(x);k.push(y);a.push(x!=null&&y!=null?(x+y)/2:null);b.push(mid(i,52));}return{tenkan:t,kijun:k,spanA:a,spanB:b};}
function sessionVwap(cs){const o=Array(cs.length).fill(null);let pv=0,v=0,day='';for(let i=0;i<cs.length;i++){const d=new Date(cs[i].time).toISOString().slice(0,10);if(d!==day){day=d;pv=0;v=0;}const typ=(cs[i].high+cs[i].low+cs[i].close)/3,vol=cs[i].volume||0;pv+=typ*vol;v+=vol;o[i]=v?pv/v:null;}return o;}
function confirmedPivots(cs,left=3,right=3){const hs=[],ls=[];for(let i=left;i<cs.length-right;i++){let h=true,l=true;for(let j=i-left;j<=i+right;j++){if(j===i)continue;if(cs[j].high>=cs[i].high)h=false;if(cs[j].low<=cs[i].low)l=false;}if(h)hs.push({pivot:i,confirmed:i+right,price:cs[i].high});if(l)ls.push({pivot:i,confirmed:i+right,price:cs[i].low});}return{hs,ls};}
function scoreStructure(h,l){if(h.length<2||l.length<2)return 50;const hh=h.at(-1).price>h.at(-2).price,lh=h.at(-1).price<h.at(-2).price,hl=l.at(-1).price>l.at(-2).price,ll=l.at(-1).price<l.at(-2).price;if(hh&&hl)return 90;if(lh&&ll)return 10;if(hh&&ll)return 62;if(lh&&hl)return 38;return 50;}
function higherDefs(tf){return tf==='15m'?[['1h',3600000],['1d',86400000]]:tf==='1h'?[['1d',86400000]]:[['1w',604800000]];}
const DEFAULT_WEIGHTS={structure:18,trend:18,momentum:14,strength:11,volumeFlow:9,liquidity:10,mtf:12,relative:5,time:3};
function composite(row,w=DEFAULT_WEIGHTS){let a=0,b=0;for(const k in w){a+=(row[k]??50)*w[k];b+=w[k];}return a/b;}

function baseFeatureMatrix(cs){
  const n=cs.length,c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),rs=rsi(c),at=atr(cs),dx=adx(cs),mc=macd(c),ic=ichimoku(cs),vw=sessionVwap(cs),vma=sma(v,20),piv=confirmedPivots(cs);
  const rows=Array(n).fill(null),activeH=[],activeL=[];let hp=0,lp=0,structTrend=0;
  for(let i=0;i<n;i++){
    while(hp<piv.hs.length&&piv.hs[hp].confirmed<=i)activeH.push(piv.hs[hp++]);
    while(lp<piv.ls.length&&piv.ls[lp].confirmed<=i)activeL.push(piv.ls[lp++]);
    if(i<210||[e20[i],e50[i],e200[i],rs[i],at[i],dx.adx[i],mc.line[i],mc.signal[i],ic.tenkan[i],ic.kijun[i],ic.spanA[i],ic.spanB[i]].some(x=>x==null))continue;
    const structure=scoreStructure(activeH,activeL);if(structure>=70)structTrend=1;else if(structure<=30)structTrend=-1;
    let emaScore=50;if(c[i]>e20[i]&&e20[i]>e50[i]&&e50[i]>e200[i])emaScore=92;else if(c[i]>e50[i]&&e50[i]>e200[i])emaScore=72;else if(c[i]<e20[i]&&e20[i]<e50[i]&&e50[i]<e200[i])emaScore=8;else if(c[i]<e50[i]&&e50[i]<e200[i])emaScore=28;
    const top=Math.max(ic.spanA[i],ic.spanB[i]),bot=Math.min(ic.spanA[i],ic.spanB[i]);let ichi=50;if(c[i]>top&&ic.tenkan[i]>ic.kijun[i])ichi=90;else if(c[i]>top)ichi=70;else if(c[i]<bot&&ic.tenkan[i]<ic.kijun[i])ichi=10;else if(c[i]<bot)ichi=30;
    const trend=(emaScore+ichi)/2,R=rs[i],rsiScore=R>=60?88:R>=55?74:R>=50?61:R>=45?41:R>=40?27:12,hist=mc.hist[i];let macdScore=50;if(mc.line[i]>mc.signal[i]&&hist>0)macdScore=82;else if(mc.line[i]>mc.signal[i])macdScore=67;else if(mc.line[i]<mc.signal[i]&&hist<0)macdScore=18;else macdScore=33;const momentum=(rsiScore+macdScore)/2;
    const A=dx.adx[i],P=dx.plus[i],M=dx.minus[i];let strength=50;if(A>=25&&P>M)strength=88;else if(A>=20&&P>M)strength=70;else if(A>=25&&M>P)strength=12;else if(A>=20&&M>P)strength=30;
    const vr=vma[i]?v[i]/vma[i]:1;let volScore=50;if(vr>=1.25&&cs[i].close>cs[i].open)volScore=78;else if(vr>=1.25&&cs[i].close<cs[i].open)volScore=22;let vwScore=50;if(vw[i]){if(c[i]>vw[i]*1.001)vwScore=72;else if(c[i]<vw[i]*.999)vwScore=28;}const volumeFlow=(volScore+vwScore)/2;
    let liquidity=50;const lastH=activeH.at(-1),lastL=activeL.at(-1),tol=at[i]*.15,bullSweep=lastL&&cs[i].low<lastL.price-tol&&cs[i].close>lastL.price,bearSweep=lastH&&cs[i].high>lastH.price+tol&&cs[i].close<lastH.price,bullBreak=lastH&&i>0&&cs[i-1].close<=lastH.price&&cs[i].close>lastH.price,bearBreak=lastL&&i>0&&cs[i-1].close>=lastL.price&&cs[i].close<lastL.price,bullChoch=bullBreak&&structTrend<0,bearChoch=bearBreak&&structTrend>0,bullFvg=i>=2&&cs[i].low>cs[i-2].high&&cs[i].low-cs[i-2].high>at[i]*.08,bearFvg=i>=2&&cs[i].high<cs[i-2].low&&cs[i-2].low-cs[i].high>at[i]*.08;
    if(bullChoch)liquidity=92;else if(bearChoch)liquidity=8;else if(bullSweep)liquidity=84;else if(bearSweep)liquidity=16;else if(bullBreak)liquidity=76;else if(bearBreak)liquidity=24;else if(bullFvg)liquidity=65;else if(bearFvg)liquidity=35;
    const hour=new Date(cs[i].time).getUTCHours();let session='Late',time=48;if(hour>=0&&hour<7){session='Asia';time=50;}else if(hour>=7&&hour<13){session='London';time=57;}else if(hour>=13&&hour<16){session='London/NY Overlap';time=62;}else if(hour>=16&&hour<21){session='New York';time=55;}
    rows[i]={structure,trend,momentum,strength,volumeFlow,liquidity,time,mtf:50,relative:50,adx:A,atr:at[i],session,close:c[i]};
  }
  return rows;
}
function addMtfContext(mainCs,rows,higherSets){
  for(const h of higherSets){if(!h||!h.candles?.length)continue;h.rows=baseFeatureMatrix(h.candles);}
  const ptrs=higherSets.map(()=>0),lastValid=higherSets.map(()=>null);
  for(let i=0;i<mainCs.length;i++){if(!rows[i])continue;const vals=[];higherSets.forEach((h,j)=>{if(!h?.candles?.length)return;while(ptrs[j]<h.candles.length&&h.candles[ptrs[j]].time+h.duration<=mainCs[i].time){if(h.rows[ptrs[j]])lastValid[j]=composite({...h.rows[ptrs[j]],mtf:50,relative:50},{structure:25,trend:30,momentum:15,strength:15,volumeFlow:5,liquidity:10});ptrs[j]++;}if(lastValid[j]!=null)vals.push(lastValid[j]);});if(vals.length)rows[i].mtf=vals.length===1?vals[0]:vals[0]*.62+mean(vals.slice(1))*.38;}
}
function addRelative(mainCs,rows,benchmarks,target){
  if(!benchmarks?.length)return;const maps=benchmarks.map(b=>new Map(b.candles.map(c=>[c.time,c])));
  for(let i=24;i<mainCs.length;i++){if(!rows[i])continue;const assetRet=mainCs[i].close/mainCs[i-24].close-1,diffs=[];benchmarks.forEach((b,j)=>{if(b.symbol===target)return;const now=maps[j].get(mainCs[i].time),prev=maps[j].get(mainCs[i-24].time);if(now&&prev&&prev.close)diffs.push(assetRet-(now.close/prev.close-1));});if(diffs.length)rows[i].relative=50+35*Math.tanh(mean(diffs)/.02);}
}
function resample(cs,tf){const ms=tf==='1h'?3600000:tf==='1d'?86400000:tf==='1w'?604800000:900000,b=new Map();for(const c of cs){const t=Math.floor(c.time/ms)*ms,x=b.get(t);if(!x)b.set(t,{time:t,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume||0});else{x.high=Math.max(x.high,c.high);x.low=Math.min(x.low,c.low);x.close=c.close;x.volume+=(c.volume||0);}}return[...b.values()].sort((a,b)=>a.time-b.time);}

function barrierOutcome(cs,i,dir,atrV,o){
  const entry=cs[i].close,fav=atrV*o.tpAtr,adv=atrV*o.slAtr,favorable=dir===1?entry+fav:entry-fav,adverse=dir===1?entry-adv:entry+adv;let mfe=-Infinity,mae=Infinity;
  for(let j=i+1;j<=Math.min(cs.length-1,i+o.horizon);j++){
    const fe=dir===1?(cs[j].high/entry-1):(entry/cs[j].low-1),ae=dir===1?(cs[j].low/entry-1):(entry/cs[j].high-1);mfe=Math.max(mfe,fe);mae=Math.min(mae,ae);
    const hf=dir===1?cs[j].high>=favorable:cs[j].low<=favorable,ha=dir===1?cs[j].low<=adverse:cs[j].high>=adverse;
    if(hf&&ha){if(o.sameBarPolicy==='conservative')return{outcome:'loss',ret:-adv/entry,mfe,mae,bars:j-i};return{outcome:'ambiguous',ret:0,mfe,mae,bars:j-i};}
    if(hf)return{outcome:'win',ret:fav/entry,mfe,mae,bars:j-i};if(ha)return{outcome:'loss',ret:-adv/entry,mfe,mae,bars:j-i};
  }
  const j=Math.min(cs.length-1,i+o.horizon),mark=dir*(cs[j].close/entry-1);return{outcome:'timeout',ret:mark,mfe,mae,bars:j-i};
}
function maxDrawdown(rs){let eq=1,peak=1,m=0;for(const r of rs){eq*=1+r;peak=Math.max(peak,eq);m=Math.max(m,(peak-eq)/peak);}return m;}
function metricsFromSignals(signals,eligible=signals.length){
  const wins=signals.filter(x=>x.outcome==='win'),losses=signals.filter(x=>x.outcome==='loss'),timeouts=signals.filter(x=>x.outcome==='timeout'),amb=signals.filter(x=>x.outcome==='ambiguous'),resolved=wins.length+losses.length;
  const longs=signals.filter(x=>x.dir===1&&(x.outcome==='win'||x.outcome==='loss')),shorts=signals.filter(x=>x.dir===-1&&(x.outcome==='win'||x.outcome==='loss')),lp=longs.length?longs.filter(x=>x.outcome==='win').length/longs.length:0,sp=shorts.length?shorts.filter(x=>x.outcome==='win').length/shorts.length:0;
  const pos=signals.filter(x=>x.ret>0).reduce((s,x)=>s+x.ret,0),neg=Math.abs(signals.filter(x=>x.ret<0).reduce((s,x)=>s+x.ret,0));
  return{signals,eligible,n:signals.length,wins:wins.length,losses:losses.length,timeouts:timeouts.length,ambiguous:amb.length,resolved,resolvedAccuracy:resolved?wins.length/resolved:0,balancedAccuracy:(lp+sp)/2,bullPrecision:lp,bearPrecision:sp,coverage:eligible?signals.length/eligible:0,resolutionRate:signals.length?resolved/signals.length:0,expectancy:mean(signals.map(x=>x.ret)),profitFactor:neg?pos/neg:(pos>0?99:0),avgMfe:mean(signals.map(x=>x.mfe)),avgMae:mean(signals.map(x=>x.mae)),avgBars:mean(signals.map(x=>x.bars)),signalDrawdown:maxDrawdown(signals.map(x=>x.ret))};
}
function evaluate(cs,rows,o,w=DEFAULT_WEIGHTS,start=210,end=null){
  const last=Math.min(end??(cs.length-o.horizon-1),cs.length-o.horizon-1),signals=[];let eligible=0;
  for(let i=Math.max(210,start);i<=last;i++){const row=rows[i];if(!row||!Number.isFinite(row.atr))continue;eligible++;const score=composite(row,w);let dir=0;if(score>=o.bull)dir=1;else if(score<=o.bear)dir=-1;else continue;signals.push({i,time:cs[i].time,score,dir,session:row.session,regime:row.adx>=25?'Trending':row.adx<18?'Ranging':'Mixed',...barrierOutcome(cs,i,dir,row.atr,o)});}
  return metricsFromSignals(signals,eligible);
}
function objective(m,penalty=0){if(m.resolved<25)return-999;const pf=Math.min(m.profitFactor,3)/3,coverage=Math.min(m.coverage,.5)/.5;return m.balancedAccuracy*.40+m.resolvedAccuracy*.22+pf*.14+coverage*.07+Math.min(Math.max(m.expectancy*40,0),.07)+m.resolutionRate*.10-penalty;}
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function normalize(raw){const sum=Object.values(raw).reduce((a,b)=>a+b,0),o={};for(const k in raw)o[k]=raw[k]/sum*100;return o;}
function regularizationPenalty(w,maxDev){let p=0,n=0;for(const k in DEFAULT_WEIGHTS){const d=Math.abs(w[k]-DEFAULT_WEIGHTS[k])/DEFAULT_WEIGHTS[k];p+=Math.max(0,d-maxDev*.65);n++;}return p/n*.08;}
function optimize(cs,rows,o,start,end,seed,candidates=150){
  const rnd=seeded(seed),maxDev=o.weightDeviation;let bestW={...DEFAULT_WEIGHTS},bestM=evaluate(cs,rows,o,bestW,start,end),best=objective(bestM);
  for(let z=0;z<candidates;z++){const raw={};for(const k in DEFAULT_WEIGHTS)raw[k]=DEFAULT_WEIGHTS[k]*(1+(rnd()*2-1)*maxDev);const w=normalize(raw),m=evaluate(cs,rows,o,w,start,end),obj=objective(m,regularizationPenalty(w,maxDev));if(obj>best){best=obj;bestW=w;bestM=m;}}
  return{weights:bestW,metrics:bestM};
}
function purgedWalkForward(cs,rows,o){
  const warm=230,N=cs.length-o.horizon-1,usable=N-warm,testSize=Math.max(90,Math.floor(usable*.11)),folds=[],allTest=[];
  for(let f=0;f<4;f++){const testStart=warm+Math.floor(usable*.45)+f*testSize;if(testStart+testSize>N)break;const purge=o.horizon+o.embargo,trainStart=warm,trainEnd=testStart-purge-1,testEnd=testStart+testSize-1;if(trainEnd-trainStart<250)continue;const opt=optimize(cs,rows,o,trainStart,trainEnd,621+f,130),test=evaluate(cs,rows,o,opt.weights,testStart,testEnd);allTest.push(...test.signals);folds.push({fold:f+1,train:opt.metrics,test,weights:opt.weights,purge});}
  const avgWeights={};for(const k in DEFAULT_WEIGHTS)avgWeights[k]=mean(folds.map(x=>x.weights[k]));
  return{folds,avgWeights,testSignals:allTest,agg:{folds:folds.length,trainBalanced:mean(folds.map(x=>x.train.balancedAccuracy)),testBalanced:mean(folds.map(x=>x.test.balancedAccuracy)),testResolved:mean(folds.map(x=>x.test.resolvedAccuracy)),testPF:mean(folds.map(x=>x.test.profitFactor)),testExpectancy:mean(folds.map(x=>x.test.expectancy)),testSignals:allTest.length,testResolvedN:allTest.filter(x=>x.outcome==='win'||x.outcome==='loss').length,overfitGap:mean(folds.map(x=>x.train.balancedAccuracy-x.test.balancedAccuracy)),resolutionRate:mean(folds.map(x=>x.test.resolutionRate))}};
}
function thresholdSweep(cs,rows,o,w){return[55,60,65,70,75,80].map(t=>({threshold:t,bear:100-t,...evaluate(cs,rows,{...o,bull:t,bear:100-t},w)}));}
function groupMetrics(signals,key){const g={};for(const s of signals)(g[s[key]]??=[]).push(s);return Object.entries(g).map(([name,a])=>({name,...metricsFromSignals(a,a.length)})).sort((a,b)=>b.n-a.n);}
function directionalCalibration(signals){
  const bands=[[65,70],[70,75],[75,80],[80,101]],out=[];
  for(const dir of [1,-1])for(const [a,b] of bands){const x=signals.filter(s=>s.dir===dir&&Math.max(s.score,100-s.score)>=a&&Math.max(s.score,100-s.score)<b),r=x.filter(s=>s.outcome==='win'||s.outcome==='loss'),w=r.filter(s=>s.outcome==='win').length;out.push({dir,band:`${a}-${b===101?'100':b}`,n:x.length,resolved:r.length,accuracy:r.length?w/r.length:0,pf:metricsFromSignals(x,x.length).profitFactor});}
  return out;
}
function sideStats(signals,dir){const a=signals.filter(s=>s.dir===dir);return metricsFromSignals(a,a.length);}
function reliability(n,gap,pf,acc){if(n>=100&&gap<=.06&&pf>=1.1&&acc>=.52)return'High';if(n>=50&&gap<=.12&&pf>=1.0&&acc>=.50)return'Medium';return'Low';}
function tierFor(stats,cal,filters,gap){
  if(!stats||stats.resolved<filters.minSample)return'X';
  const calOK=!cal||cal.resolved<filters.calMinSample?false:cal.accuracy>=filters.minAccuracy;
  if(stats.resolved>=100&&stats.resolvedAccuracy>=.58&&stats.profitFactor>=1.25&&stats.expectancy>0&&gap<=.07&&calOK)return'A';
  if(stats.resolved>=60&&stats.resolvedAccuracy>=.54&&stats.profitFactor>=1.10&&stats.expectancy>=0&&gap<=.12&&(calOK||cal?.resolved<filters.calMinSample))return'B';
  if(stats.resolved>=filters.minSample&&stats.resolvedAccuracy>=filters.minAccuracy&&stats.profitFactor>=filters.minPF&&stats.expectancy>=0)return'C';
  return'X';
}
function subgroupStats(signals,dir,session,regime){
  const levels=[
    {name:'Side + Session + Regime',a:signals.filter(s=>s.dir===dir&&s.session===session&&s.regime===regime)},
    {name:'Side + Session',a:signals.filter(s=>s.dir===dir&&s.session===session)},
    {name:'Side + Regime',a:signals.filter(s=>s.dir===dir&&s.regime===regime)},
    {name:'Side overall',a:signals.filter(s=>s.dir===dir)}
  ];
  return levels.map(x=>({name:x.name,...metricsFromSignals(x.a,x.a.length)}));
}
function calibrationForCurrent(cal,dir,score){const strength=Math.max(score,100-score);return cal.find(x=>x.dir===dir&&strength>=+x.band.split('-')[0]&&strength<(x.band.endsWith('100')?101:+x.band.split('-')[1]))||null;}

async function fetchHistory(symbol,interval,market,total){
  const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,''),base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';let end=Date.now(),all=[];
  while(all.length<total){const limit=Math.min(1000,total-all.length),u=`${base}?symbol=${encodeURIComponent(clean)}&interval=${interval}&limit=${limit}&endTime=${end}`,r=await fetch(u),d=await r.json();if(!r.ok||!Array.isArray(d))throw new Error(d?.msg||'تعذر جلب Binance.');if(!d.length)break;const b=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));all=[...b,...all];end=b[0].time-1;$('status').textContent=`تحميل ${symbol} ${interval}: ${all.length}/${total}`;if(b.length<limit)break;}
  const seen=new Set();return all.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time).slice(-total);
}
function parseCsv(text){const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean),split=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===','&&!q){o.push(c);c='';}else c+=ch;}o.push(c);return o;},h=split(lines[0]).map(x=>x.trim().toLowerCase()),ix=ns=>ns.map(n=>h.indexOf(n)).find(i=>i>=0),ti=ix(['time','timestamp','date','datetime']),oi=ix(['open']),hi=ix(['high']),li=ix(['low']),ci=ix(['close']),vi=ix(['volume','vol']);if([ti,oi,hi,li,ci].some(x=>x===undefined))throw new Error('CSV يحتاج Time/Open/High/Low/Close.');return lines.slice(1).map(l=>{const p=split(l);let t=+p[ti];if(!Number.isFinite(t)||t<1e9)t=Date.parse(p[ti]);if(t<1e11)t*=1000;return{time:t,open:+p[oi],high:+p[hi],low:+p[li],close:+p[ci],volume:vi===undefined?0:+p[vi]};}).filter(c=>Object.values(c).every(Number.isFinite)).sort((a,b)=>a.time-b.time);}
function options(){return{horizon:+$('horizon').value,tpAtr:+$('tpAtr').value,slAtr:+$('slAtr').value,embargo:+$('embargo').value,bull:+$('bullThreshold').value,bear:+$('bearThreshold').value,weightDeviation:+$('weightDeviation').value,sameBarPolicy:$('sameBarPolicy').value};}
function filterOptions(){return{minSample:+$('minSample').value,minAccuracy:+$('minAccuracy').value,minPF:+$('minPF').value,calMinSample:+$('calMinSample').value};}
async function prepareCrypto(symbol,tf,market,total){
  const main=await fetchHistory(symbol,tf,market,total),rows=baseFeatureMatrix(main),hsets=[];
  for(const [htf,duration] of higherDefs(tf)){const need=htf==='1w'?420:520;hsets.push({tf:htf,duration,candles:await fetchHistory(symbol,htf,market,need)});}
  addMtfContext(main,rows,hsets);
  const bench=[];for(const s of ['BTCUSDT','ETHUSDT']){try{bench.push({symbol:s,candles:await fetchHistory(s,tf,'spot',total)});}catch{}}
  addRelative(main,rows,bench,symbol.toUpperCase());return{main,rows};
}
function prepareForex(cs,tf){const rows=baseFeatureMatrix(cs),sets=[];for(const [htf,duration] of higherDefs(tf)){const rs=resample(cs,htf);if(rs.length>60)sets.push({tf:htf,duration,candles:rs});}addMtfContext(cs,rows,sets);return{main:cs,rows};}
function saveRun(report){const key='trendV53Runs',all=JSON.parse(localStorage.getItem(key)||'{}');all[`${report.symbol}|${report.tf}`]={symbol:report.symbol,tf:report.tf,when:new Date().toISOString(),wfBalanced:report.wf.agg.testBalanced,wfPF:report.wf.agg.testPF,overfitGap:report.wf.agg.overfitGap,longAcc:report.longOOS.resolvedAccuracy,longPF:report.longOOS.profitFactor,shortAcc:report.shortOOS.resolvedAccuracy,shortPF:report.shortOOS.profitFactor,tier:report.scenario.tier,status:report.scenario.status};localStorage.setItem(key,JSON.stringify(all));}
function getSavedRuns(){return Object.values(JSON.parse(localStorage.getItem('trendV53Runs')||'{}')).sort((a,b)=>a.symbol.localeCompare(b.symbol));}

async function runResearch(main,rows,symbol,tf,source){
  if(main.length<650)throw new Error('يفضل V5.3 تاريخًا ≥ 650 شمعة.');const o=options(),filters=filterOptions();
  $('status').textContent='Purged Walk‑Forward + side-specific OOS...';await new Promise(r=>setTimeout(r,20));
  const wf=purgedWalkForward(main,rows,o),optimized=evaluate(main,rows,o,wf.avgWeights),longOOS=sideStats(wf.testSignals,1),shortOOS=sideStats(wf.testSignals,-1),calibration=directionalCalibration(wf.testSignals),sessions=groupMetrics(wf.testSignals,'session'),regimes=groupMetrics(wf.testSignals,'regime'),thresholds=thresholdSweep(main,rows,o,wf.avgWeights);
  const lastIndex=[...rows.keys()].reverse().find(i=>rows[i]&&Number.isFinite(rows[i].atr)),lastRow=rows[lastIndex],score=composite(lastRow,wf.avgWeights);let dir=0;if(score>=o.bull)dir=1;else if(score<=o.bear)dir=-1;
  let scenario={status:'Blocked',tier:'X',reason:'لا توجد إشارة تتجاوز Threshold على آخر شمعة مغلقة.',score,dir:0};
  if(dir!==0){
    const regime=lastRow.adx>=25?'Trending':lastRow.adx<18?'Ranging':'Mixed',subs=subgroupStats(wf.testSignals,dir,lastRow.session,regime),chosen=subs.find(x=>x.resolved>=filters.minSample)||subs.at(-1),cal=calibrationForCurrent(calibration,dir,score),tier=tierFor(chosen,cal,filters,wf.agg.overfitGap),allowed=tier!=='X';
    const price=main[lastIndex].close,atrV=lastRow.atr,side=dir===1?'Bullish paper hypothesis':'Bearish paper hypothesis';
    scenario={status:allowed?'Allowed':'Blocked',tier,reason:allowed?`${chosen.name} يمر بحدود البحث المحددة.`:`${chosen.name} لا يحقق شروط العينة/الدقة/PF الحالية.`,score,dir,side,session:lastRow.session,regime,stats:chosen,cal,price,atr:atrV,reference:price,favorable1:dir===1?price+atrV*o.tpAtr:price-atrV*o.tpAtr,adverse:dir===1?price-atrV*o.slAtr:price+atrV*o.slAtr,favorable2:dir===1?price+atrV*o.tpAtr*1.5:price-atrV*o.tpAtr*1.5,subs};
  }
  const report={symbol,tf,source,candles:main.length,o,filters,wf,optimized,longOOS,shortOOS,calibration,sessions,regimes,thresholds,weights:wf.avgWeights,scenario,reliability:{long:reliability(longOOS.resolved,wf.agg.overfitGap,longOOS.profitFactor,longOOS.resolvedAccuracy),short:reliability(shortOOS.resolved,wf.agg.overfitGap,shortOOS.profitFactor,shortOOS.resolvedAccuracy),model:reliability(wf.agg.testResolvedN,wf.agg.overfitGap,wf.agg.testPF,wf.agg.testResolved)}};
  saveRun(report);render(report);$('status').textContent='اكتمل V5.3.';
}
$('runCryptoBtn').onclick=async()=>{const b=$('runCryptoBtn');b.disabled=true;try{const symbol=$('symbol').value.trim().toUpperCase(),tf=$('timeframe').value,market=$('market').value,total=+$('historySize').value,p=await prepareCrypto(symbol,tf,market,total);await runResearch(p.main,p.rows,symbol,tf,`Binance ${market}`);}catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}};
$('runForexBtn').onclick=async()=>{const f=$('forexCsv').files[0];if(!f){$('status').textContent='اختر CSV أولًا.';return;}const b=$('runForexBtn');b.disabled=true;try{const cs=parseCsv(await f.text()),tf=$('forexTf').value,p=prepareForex(cs,tf);await runResearch(p.main,p.rows,$('forexSymbol').value.trim(),tf,'Forex CSV');}catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}};

function metric(label,value,cls=''){return`<div class="metric"><small>${label}</small><b class="${cls}">${value}</b></div>`;}
function qcls(v){return v>=.56?'good':v>=.50?'warn':'bad';}
function pfcls(v){return v>=1.15?'good':v>=.98?'warn':'bad';}
function reliabilityHtml(x){const cls=x==='High'?'dotHigh':x==='Medium'?'dotMed':'dotLow';return`<span class="reliability"><span class="dot ${cls}"></span><b>${x}</b></span>`;}
function renderSide(title,m,rel,color){
  return `<h2>${title}</h2><div class="score ${color}">${(m.resolvedAccuracy*100).toFixed(1)}%</div><p class="muted">OOS resolved side accuracy</p><div class="metrics">
  ${metric('Resolved N',m.resolved)}${metric('Reliability',rel,rel==='High'?'good':rel==='Medium'?'warn':'bad')}
  ${metric('Profit Factor',fmt(m.profitFactor,2),pfcls(m.profitFactor))}${metric('Expectancy',pct(m.expectancy))}
  ${metric('Wins',m.wins)}${metric('Losses',m.losses)}
  ${metric('Resolution',(m.resolutionRate*100).toFixed(1)+'%')}${metric('Avg bars',fmt(m.avgBars,1))}
  </div>`;
}
function render(r){
  ['summaryCard','longCard','shortCard','scenarioCard','filterMatrixCard','calibrationCard','wfCard','reliabilityCard','weightsCard','thresholdCard','sessionCard','regimeCard','robustnessCard'].forEach(id=>$(id).classList.remove('hidden'));
  $('sideGrid').classList.remove('hidden');$('coreGrid').classList.remove('hidden');$('regimeGrid').classList.remove('hidden');
  const w=r.wf.agg;
  $('summaryCard').innerHTML=`<h2>${esc(r.symbol)} — ${esc(r.tf)} — V5.3</h2><div class="score ${qcls(w.testBalanced)}">${(w.testBalanced*100).toFixed(1)}%</div><strong>Out‑of‑Sample Balanced Accuracy</strong><p class="muted">${esc(r.source)} • ${r.candles} candles • OOS resolved N ${w.testResolvedN}</p><div class="note ${w.overfitGap<.05?'good':w.overfitGap<.10?'warn':'bad'}">Test PF ${fmt(w.testPF,2)} • Test expectancy ${pct(w.testExpectancy)} • Overfit gap ${(w.overfitGap*100).toFixed(1)}% • Model reliability ${r.reliability.model}</div>`;
  $('longCard').innerHTML=renderSide('LONG — OOS',r.longOOS,r.reliability.long,'bullish');
  $('shortCard').innerHTML=renderSide('SHORT — OOS',r.shortOOS,r.reliability.short,'bearish');

  const s=r.scenario,tierClass=s.tier==='A'?'tierA':s.tier==='B'?'tierB':s.tier==='C'?'tierC':'tierX';
  $('scenarioCard').className=`card ${s.status==='Allowed'?'filterAllowed':'filterBlocked'}`;
  $('scenarioCard').innerHTML=`<h2>Paper Scenario Engine — Last Closed Bar</h2><div class="scenarioHero"><div class="scenarioBox">
    <div class="tier ${tierClass}">Tier ${s.tier}</div>
    <h3>${s.status==='Allowed'?'ALLOWED FOR PAPER RESEARCH':'BLOCKED BY RESEARCH FILTER'}</h3>
    <p>${esc(s.reason)}</p>
    <div class="metrics">${metric('Score',fmt(s.score,1))}${metric('Side',s.dir===1?'Bullish':s.dir===-1?'Bearish':'No signal')}${s.session?metric('Session',esc(s.session)):''}${s.regime?metric('Regime',esc(s.regime)):''}</div>
    ${s.stats?`<p class="muted">Supporting OOS group: ${esc(s.stats.name)} • Resolved N ${s.stats.resolved} • Accuracy ${(s.stats.resolvedAccuracy*100).toFixed(1)}% • PF ${fmt(s.stats.profitFactor,2)} • Expectancy ${pct(s.stats.expectancy)}</p>`:''}
    </div><div class="scenarioBox">
    <h3>Paper-only ATR reference levels</h3>
    ${s.dir?`<div class="levelgrid">
      <div class="level"><small>Reference close</small><strong>${fmt(s.reference,6)}</strong></div>
      <div class="level"><small>Paper favorable barrier 1</small><strong>${fmt(s.favorable1,6)}</strong></div>
      <div class="level"><small>Paper adverse barrier</small><strong>${fmt(s.adverse,6)}</strong></div>
      <div class="level"><small>Paper extension barrier</small><strong>${fmt(s.favorable2,6)}</strong></div>
    </div><p class="muted">هذه مستويات محاكاة للـPaper Research مرتبطة بإعداد ATR في الاختبار، وليست أسعار دخول/خروج أو توصية تنفيذ.</p>`:'<p class="muted">لا توجد إشارة حالية تتجاوز Threshold، لذلك لا يتم إنشاء مستويات محاكاة.</p>'}
    </div></div>`;

  const subs=s.subs||[];
  $('filterMatrixCard').innerHTML=`<h2>OOS Filter Evidence — Current Side</h2><div class="tablewrap"><table><thead><tr><th>Filter level</th><th>Resolved N</th><th>Accuracy</th><th>PF</th><th>Expectancy</th><th>Resolution</th></tr></thead><tbody>${subs.length?subs.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.resolved}</td><td>${(x.resolvedAccuracy*100).toFixed(1)}%</td><td>${fmt(x.profitFactor,2)}</td><td>${pct(x.expectancy)}</td><td>${(x.resolutionRate*100).toFixed(1)}%</td></tr>`).join(''):`<tr><td colspan="6">No current side signal</td></tr>`}</tbody></table></div>`;

  $('calibrationCard').innerHTML=`<h2>Directional OOS Score Calibration</h2><p class="muted">يتم فصل Long وShort. الخانة ذات عينة أقل من ${r.filters.calMinSample} لا ينبغي تفسيرها بقوة.</p>`+
    r.calibration.map(x=>`<div class="calrow"><b class="${x.dir===1?'bullish':'bearish'}">${x.dir===1?'LONG':'SHORT'}</b><span>${x.band}</span><div class="calbar"><div style="width:${x.accuracy*100}%"></div></div><span>${x.resolved}</span><strong class="${qcls(x.accuracy)}">${(x.accuracy*100).toFixed(1)}%</strong></div>`).join('');

  $('wfCard').innerHTML=`<h2>Purged Walk‑Forward</h2><div class="metrics">${metric('Folds',w.folds)}${metric('Test resolved N',w.testResolvedN)}${metric('Train balanced',(w.trainBalanced*100).toFixed(1)+'%')}${metric('OOS balanced',(w.testBalanced*100).toFixed(1)+'%',qcls(w.testBalanced))}${metric('Test PF',fmt(w.testPF,2),pfcls(w.testPF))}${metric('Test expectancy',pct(w.testExpectancy))}${metric('Overfit gap',(w.overfitGap*100).toFixed(1)+'%',w.overfitGap<.05?'good':w.overfitGap<.10?'warn':'bad')}${metric('Resolution',(w.resolutionRate*100).toFixed(1)+'%')}</div>`;
  $('reliabilityCard').innerHTML=`<h2>Sample Reliability</h2><div class="metrics">${metric('Model',r.reliability.model,r.reliability.model==='High'?'good':r.reliability.model==='Medium'?'warn':'bad')}${metric('Long',r.reliability.long,r.reliability.long==='High'?'good':r.reliability.long==='Medium'?'warn':'bad')}${metric('Short',r.reliability.short,r.reliability.short==='High'?'good':r.reliability.short==='Medium'?'warn':'bad')}${metric('Min OOS sample',r.filters.minSample)}${metric('Min side accuracy',(r.filters.minAccuracy*100).toFixed(0)+'%')}${metric('Min PF',fmt(r.filters.minPF,2))}</div><p class="muted">High لا تعني ضمانًا. تعني فقط أن حجم العينة، PF، الدقة، وOverfit gap أفضل نسبيًا حسب القواعد المحددة.</p>`;

  const labels={structure:'Structure',trend:'Trend',momentum:'Momentum',strength:'ADX Strength',volumeFlow:'Volume/VWAP',liquidity:'Liquidity/CHoCH/FVG',mtf:'MTF Context',relative:'Relative BTC/ETH',time:'Session Time'};
  $('weightsCard').innerHTML=`<h2>Regularized Adaptive Weights</h2>`+Object.keys(DEFAULT_WEIGHTS).map(k=>`<div class="weightrow"><b>${labels[k]}</b><div class="bar"><div style="width:${Math.min(100,r.weights[k]*3.4)}%"></div></div><span>${DEFAULT_WEIGHTS[k].toFixed(1)}</span><strong>${fmt(r.weights[k],1)}</strong></div>`).join('');

  $('thresholdCard').innerHTML=`<h2>Threshold Sweep — Full Research Sample</h2><div class="tablewrap"><table><thead><tr><th>Bull/Bear</th><th>Signals</th><th>Resolved Acc</th><th>Balanced</th><th>Long P</th><th>Short P</th><th>PF</th><th>Expectancy</th></tr></thead><tbody>${r.thresholds.map(x=>`<tr><td>${x.threshold}/${x.bear}</td><td>${x.n}</td><td>${(x.resolvedAccuracy*100).toFixed(1)}%</td><td>${(x.balancedAccuracy*100).toFixed(1)}%</td><td>${(x.bullPrecision*100).toFixed(1)}%</td><td>${(x.bearPrecision*100).toFixed(1)}%</td><td>${fmt(x.profitFactor,2)}</td><td>${pct(x.expectancy)}</td></tr>`).join('')}</tbody></table></div>`;

  function groupTable(title,rows){return`<h2>${title} — OOS only</h2><div class="tablewrap"><table><thead><tr><th>Group</th><th>N</th><th>Resolved Acc</th><th>Balanced</th><th>PF</th><th>Expectancy</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.n}</td><td>${(x.resolvedAccuracy*100).toFixed(1)}%</td><td>${(x.balancedAccuracy*100).toFixed(1)}%</td><td>${fmt(x.profitFactor,2)}</td><td>${pct(x.expectancy)}</td></tr>`).join('')}</tbody></table></div>`;}
  $('sessionCard').innerHTML=groupTable('Performance by Session',r.sessions);
  $('regimeCard').innerHTML=groupTable('Performance by Regime',r.regimes);

  const saved=getSavedRuns();
  $('robustnessCard').innerHTML=`<h2>Cross‑Asset Robustness — Saved V5.3 Runs</h2><div class="robust-grid">${saved.map(x=>`<div class="robust"><strong>${esc(x.symbol)} — ${esc(x.tf)}</strong><div>WF Balanced ${(x.wfBalanced*100).toFixed(1)}% • PF ${fmt(x.wfPF,2)}</div><div class="bullish">Long ${(x.longAcc*100).toFixed(1)}% • PF ${fmt(x.longPF,2)}</div><div class="bearish">Short ${(x.shortAcc*100).toFixed(1)}% • PF ${fmt(x.shortPF,2)}</div><div>Paper filter: ${esc(x.status)} • Tier ${esc(x.tier)}</div><div class="small">Overfit gap ${(x.overfitGap*100).toFixed(1)}%</div></div>`).join('')}</div>`;
}
