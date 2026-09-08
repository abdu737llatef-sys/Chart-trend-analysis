const $=id=>document.getElementById(id);
let deferredPrompt=null,mode='crypto';

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
  const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.2.0',{updateViaCache:'none'});
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
function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;const k=2/(p+1);let z=v.slice(0,p).reduce((a,b)=>a+b,0)/p;o[p-1]=z;for(let i=p;i<v.length;i++){z=v[i]*k+z*(1-k);o[i]=z;}return o;}
function sma(v,p){const o=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)o[i]=s/p;}return o;}
function rsi(c,p=14){const o=Array(c.length).fill(null);if(c.length<=p)return o;const g=[],l=[];for(let i=1;i<c.length;i++){const d=c[i]-c[i-1];g.push(Math.max(d,0));l.push(Math.max(-d,0));}let ag=mean(g.slice(0,p)),al=mean(l.slice(0,p));const f=()=>al===0?100:100-100/(1+ag/al);o[p]=f();for(let i=p+1;i<c.length;i++){ag=(ag*(p-1)+g[i-1])/p;al=(al*(p-1)+l[i-1])/p;o[i]=f();}return o;}
function atr(cs,p=14){const tr=cs.map((c,i)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-cs[i-1].close),Math.abs(c.low-cs[i-1].close)));const o=Array(cs.length).fill(null);if(cs.length<p)return o;let x=mean(tr.slice(0,p));o[p-1]=x;for(let i=p;i<cs.length;i++){x=(x*(p-1)+tr[i])/p;o[i]=x;}return o;}
function wilder(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let s=v.slice(0,p).reduce((a,b)=>a+b,0);o[p-1]=s;for(let i=p;i<v.length;i++){s=s-s/p+(v[i]||0);o[i]=s;}return o;}
function adx(cs,p=14){const n=cs.length,pd=Array(n).fill(0),md=Array(n).fill(0),tr=Array(n).fill(0);for(let i=1;i<n;i++){const up=cs[i].high-cs[i-1].high,dn=cs[i-1].low-cs[i].low;pd[i]=up>dn&&up>0?up:0;md[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(cs[i].high-cs[i].low,Math.abs(cs[i].high-cs[i-1].close),Math.abs(cs[i].low-cs[i-1].close));}const t=wilder(tr.slice(1),p),pp=wilder(pd.slice(1),p),mm=wilder(md.slice(1),p),plus=Array(n).fill(null),minus=Array(n).fill(null),dx=Array(n).fill(null),ao=Array(n).fill(null);for(let j=p-1;j<t.length;j++){const i=j+1;if(!t[j])continue;plus[i]=100*pp[j]/t[j];minus[i]=100*mm[j]/t[j];const den=plus[i]+minus[i];dx[i]=den?100*Math.abs(plus[i]-minus[i])/den:0;}const vals=[],idx=[];for(let i=0;i<n;i++)if(dx[i]!==null){vals.push(dx[i]);idx.push(i);}if(vals.length>=p){let a=mean(vals.slice(0,p));ao[idx[p-1]]=a;for(let k=p;k<vals.length;k++){a=(a*(p-1)+vals[k])/p;ao[idx[k]]=a;}}return{adx:ao,plus,minus};}
function macd(c){const f=ema(c,12),s=ema(c,26),line=c.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),compact=line.filter(x=>x!=null),sigc=ema(compact,9),signal=Array(c.length).fill(null);let j=0;for(let i=0;i<c.length;i++)if(line[i]!=null)signal[i]=sigc[j++]??null;return{line,signal,hist:line.map((x,i)=>x!=null&&signal[i]!=null?x-signal[i]:null)};}
function ichimoku(cs){const mid=(i,p)=>{if(i<p-1)return null;let hi=-Infinity,lo=Infinity;for(let j=i-p+1;j<=i;j++){hi=Math.max(hi,cs[j].high);lo=Math.min(lo,cs[j].low);}return(hi+lo)/2;};const t=[],k=[],a=[],b=[];for(let i=0;i<cs.length;i++){const x=mid(i,9),y=mid(i,26);t.push(x);k.push(y);a.push(x!=null&&y!=null?(x+y)/2:null);b.push(mid(i,52));}return{tenkan:t,kijun:k,spanA:a,spanB:b};}
function sessionVwap(cs){const o=Array(cs.length).fill(null);let pv=0,v=0,day='';for(let i=0;i<cs.length;i++){const d=new Date(cs[i].time).toISOString().slice(0,10);if(d!==day){day=d;pv=0;v=0;}const typ=(cs[i].high+cs[i].low+cs[i].close)/3,vol=cs[i].volume||0;pv+=typ*vol;v+=vol;o[i]=v?pv/v:null;}return o;}

function confirmedPivots(cs,left=3,right=3){
  const hs=[],ls=[];
  for(let i=left;i<cs.length-right;i++){
    let h=true,l=true;
    for(let j=i-left;j<=i+right;j++){if(j===i)continue;if(cs[j].high>=cs[i].high)h=false;if(cs[j].low<=cs[i].low)l=false;}
    if(h)hs.push({pivot:i,confirmed:i+right,price:cs[i].high});
    if(l)ls.push({pivot:i,confirmed:i+right,price:cs[i].low});
  }
  return{hs,ls};
}
function scoreStructure(activeH,activeL){
  if(activeH.length<2||activeL.length<2)return 50;
  const hh=activeH.at(-1).price>activeH.at(-2).price,lh=activeH.at(-1).price<activeH.at(-2).price;
  const hl=activeL.at(-1).price>activeL.at(-2).price,ll=activeL.at(-1).price<activeL.at(-2).price;
  if(hh&&hl)return 90;if(lh&&ll)return 10;if(hh&&ll)return 62;if(lh&&hl)return 38;return 50;
}
function higherDuration(tf){return tf==='15m'?15*60e3:tf==='1h'?60*60e3:tf==='1d'?24*60*60e3:tf==='1w'?7*24*60*60e3:60*60e3;}
function higherDefs(tf){return tf==='15m'?[['1h',60*60e3],['1d',24*60*60e3]]:tf==='1h'?[['1d',24*60*60e3]]:[['1w',7*24*60*60e3]];}

function baseFeatureMatrix(cs){
  const n=cs.length,c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),rs=rsi(c),at=atr(cs),dx=adx(cs),mc=macd(c),ic=ichimoku(cs),vw=sessionVwap(cs),vma=sma(v,20),piv=confirmedPivots(cs);
  const rows=Array(n).fill(null),activeH=[],activeL=[];let hp=0,lp=0,structTrend=0;
  for(let i=0;i<n;i++){
    while(hp<piv.hs.length&&piv.hs[hp].confirmed<=i)activeH.push(piv.hs[hp++]);
    while(lp<piv.ls.length&&piv.ls[lp].confirmed<=i)activeL.push(piv.ls[lp++]);
    if(i<210||[e20[i],e50[i],e200[i],rs[i],at[i],dx.adx[i],mc.line[i],mc.signal[i],ic.tenkan[i],ic.kijun[i],ic.spanA[i],ic.spanB[i]].some(x=>x==null))continue;

    const structure=scoreStructure(activeH,activeL);
    if(structure>=70)structTrend=1;else if(structure<=30)structTrend=-1;

    let emaScore=50;
    if(c[i]>e20[i]&&e20[i]>e50[i]&&e50[i]>e200[i])emaScore=92;
    else if(c[i]>e50[i]&&e50[i]>e200[i])emaScore=72;
    else if(c[i]<e20[i]&&e20[i]<e50[i]&&e50[i]<e200[i])emaScore=8;
    else if(c[i]<e50[i]&&e50[i]<e200[i])emaScore=28;

    const top=Math.max(ic.spanA[i],ic.spanB[i]),bot=Math.min(ic.spanA[i],ic.spanB[i]);
    let ichi=50;if(c[i]>top&&ic.tenkan[i]>ic.kijun[i])ichi=90;else if(c[i]>top)ichi=70;else if(c[i]<bot&&ic.tenkan[i]<ic.kijun[i])ichi=10;else if(c[i]<bot)ichi=30;
    const trend=(emaScore+ichi)/2;

    const R=rs[i],rsiScore=R>=60?88:R>=55?74:R>=50?61:R>=45?41:R>=40?27:12;
    const hist=mc.hist[i];let macdScore=50;if(mc.line[i]>mc.signal[i]&&hist>0)macdScore=82;else if(mc.line[i]>mc.signal[i])macdScore=67;else if(mc.line[i]<mc.signal[i]&&hist<0)macdScore=18;else macdScore=33;
    const momentum=(rsiScore+macdScore)/2;

    const A=dx.adx[i],P=dx.plus[i],M=dx.minus[i];let strength=50;
    if(A>=25&&P>M)strength=88;else if(A>=20&&P>M)strength=70;else if(A>=25&&M>P)strength=12;else if(A>=20&&M>P)strength=30;

    const vr=vma[i]?v[i]/vma[i]:1;let volScore=50;if(vr>=1.25&&cs[i].close>cs[i].open)volScore=78;else if(vr>=1.25&&cs[i].close<cs[i].open)volScore=22;
    let vwScore=50;if(vw[i]){if(c[i]>vw[i]*1.001)vwScore=72;else if(c[i]<vw[i]*.999)vwScore=28;}
    const volumeFlow=(volScore+vwScore)/2;

    // Historical liquidity: only confirmed pivots available at i.
    let liquidity=50;
    const lastH=activeH.at(-1),lastL=activeL.at(-1),tol=at[i]*.15;
    const bullSweep=lastL&&cs[i].low<lastL.price-tol&&cs[i].close>lastL.price;
    const bearSweep=lastH&&cs[i].high>lastH.price+tol&&cs[i].close<lastH.price;
    const bullBreak=lastH&&i>0&&cs[i-1].close<=lastH.price&&cs[i].close>lastH.price;
    const bearBreak=lastL&&i>0&&cs[i-1].close>=lastL.price&&cs[i].close<lastL.price;
    const bullChoch=bullBreak&&structTrend<0,bearChoch=bearBreak&&structTrend>0;
    const bullFvg=i>=2&&cs[i].low>cs[i-2].high&&cs[i].low-cs[i-2].high>at[i]*.08;
    const bearFvg=i>=2&&cs[i].high<cs[i-2].low&&cs[i-2].low-cs[i].high>at[i]*.08;
    if(bullChoch)liquidity=92;else if(bearChoch)liquidity=8;else if(bullSweep)liquidity=84;else if(bearSweep)liquidity=16;else if(bullBreak)liquidity=76;else if(bearBreak)liquidity=24;else if(bullFvg)liquidity=65;else if(bearFvg)liquidity=35;

    const hour=new Date(cs[i].time).getUTCHours();
    let session='Late',time=48;
    if(hour>=0&&hour<7){session='Asia';time=50;}
    else if(hour>=7&&hour<13){session='London';time=57;}
    else if(hour>=13&&hour<16){session='London/NY Overlap';time=62;}
    else if(hour>=16&&hour<21){session='New York';time=55;}

    rows[i]={structure,trend,momentum,strength,volumeFlow,liquidity,time,mtf:50,relative:50,adx:A,atr:at[i],session,close:c[i]};
  }
  return rows;
}
const DEFAULT_WEIGHTS={structure:18,trend:18,momentum:14,strength:11,volumeFlow:9,liquidity:10,mtf:12,relative:5,time:3};
function composite(row,w=DEFAULT_WEIGHTS){let a=0,b=0;for(const k in w){a+=(row[k]??50)*w[k];b+=w[k];}return a/b;}

function addMtfContext(mainCs,rows,higherSets){
  for(const h of higherSets){
    if(!h||!h.candles?.length)continue;
    h.rows=baseFeatureMatrix(h.candles);
  }
  const ptrs=higherSets.map(()=>0),lastValid=higherSets.map(()=>null);
  for(let i=0;i<mainCs.length;i++){
    if(!rows[i])continue;
    const vals=[];
    higherSets.forEach((h,j)=>{
      if(!h||!h.candles?.length)return;
      while(ptrs[j]<h.candles.length && h.candles[ptrs[j]].time+h.duration<=mainCs[i].time){
        if(h.rows[ptrs[j]])lastValid[j]=composite({...h.rows[ptrs[j]],mtf:50,relative:50},{structure:25,trend:30,momentum:15,strength:15,volumeFlow:5,liquidity:10});
        ptrs[j]++;
      }
      if(lastValid[j]!=null)vals.push(lastValid[j]);
    });
    if(vals.length)rows[i].mtf=vals.length===1?vals[0]:vals[0]*.62+vals.slice(1).reduce((s,x)=>s+x,0)/(vals.length-1)*.38;
  }
}
function addRelative(mainCs,rows,benchmarks,target){
  if(!benchmarks?.length)return;
  const maps=benchmarks.map(b=>new Map(b.candles.map((c,i)=>[c.time,{c,i}])));
  for(let i=24;i<mainCs.length;i++){
    if(!rows[i])continue;
    const assetRet=mainCs[i].close/mainCs[i-24].close-1,diffs=[];
    benchmarks.forEach((b,j)=>{
      if(b.symbol===target)return;
      const m=maps[j],now=m.get(mainCs[i].time),prev=m.get(mainCs[i-24].time);
      if(now&&prev&&prev.c.close)diffs.push(assetRet-(now.c.close/prev.c.close-1));
    });
    if(diffs.length){
      const d=mean(diffs);
      rows[i].relative=50+35*Math.tanh(d/.02);
    }
  }
}
function resample(cs,tf){
  const ms=tf==='1h'?3600000:tf==='1d'?86400000:tf==='1w'?604800000:900000;
  const buckets=new Map();
  for(const c of cs){
    const t=Math.floor(c.time/ms)*ms;
    const x=buckets.get(t);
    if(!x)buckets.set(t,{time:t,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume||0});
    else{x.high=Math.max(x.high,c.high);x.low=Math.min(x.low,c.low);x.close=c.close;x.volume+=(c.volume||0);}
  }
  return[...buckets.values()].sort((a,b)=>a.time-b.time);
}

function barrierOutcome(cs,i,dir,atrV,o){
  const entry=cs[i].close,fav=atrV*o.tpAtr,adv=atrV*o.slAtr;
  const favorable=dir===1?entry+fav:entry-fav,adverse=dir===1?entry-adv:entry+adv;
  let mfe=-Infinity,mae=Infinity;
  for(let j=i+1;j<=Math.min(cs.length-1,i+o.horizon);j++){
    const favorableExc=dir===1?(cs[j].high/entry-1):(entry/cs[j].low-1);
    const adverseExc=dir===1?(cs[j].low/entry-1):(entry/cs[j].high-1);
    mfe=Math.max(mfe,favorableExc);mae=Math.min(mae,adverseExc);
    const hitFav=dir===1?cs[j].high>=favorable:cs[j].low<=favorable;
    const hitAdv=dir===1?cs[j].low<=adverse:cs[j].high>=adverse;
    if(hitFav&&hitAdv){
      if(o.sameBarPolicy==='conservative')return{outcome:'loss',ret:-adv/entry,mfe,mae,bars:j-i};
      return{outcome:'ambiguous',ret:0,mfe,mae,bars:j-i};
    }
    if(hitFav)return{outcome:'win',ret:fav/entry,mfe,mae,bars:j-i};
    if(hitAdv)return{outcome:'loss',ret:-adv/entry,mfe,mae,bars:j-i};
  }
  const j=Math.min(cs.length-1,i+o.horizon),mark=dir*(cs[j].close/entry-1);
  return{outcome:'timeout',ret:mark,mfe,mae,bars:j-i};
}
function maxDrawdown(returns){
  let eq=1,peak=1,mdd=0;
  for(const r of returns){eq*=1+r;peak=Math.max(peak,eq);mdd=Math.max(mdd,(peak-eq)/peak);}
  return mdd;
}
function metricsFromSignals(signals,eligible){
  const wins=signals.filter(x=>x.outcome==='win'),losses=signals.filter(x=>x.outcome==='loss'),timeouts=signals.filter(x=>x.outcome==='timeout'),amb=signals.filter(x=>x.outcome==='ambiguous');
  const resolved=wins.length+losses.length,longResolved=signals.filter(x=>x.dir===1&&(x.outcome==='win'||x.outcome==='loss')),shortResolved=signals.filter(x=>x.dir===-1&&(x.outcome==='win'||x.outcome==='loss'));
  const longPrec=longResolved.length?longResolved.filter(x=>x.outcome==='win').length/longResolved.length:0;
  const shortPrec=shortResolved.length?shortResolved.filter(x=>x.outcome==='win').length/shortResolved.length:0;
  const pos=signals.filter(x=>x.ret>0).reduce((s,x)=>s+x.ret,0),neg=Math.abs(signals.filter(x=>x.ret<0).reduce((s,x)=>s+x.ret,0));
  return{
    signals,eligible,n:signals.length,wins:wins.length,losses:losses.length,timeouts:timeouts.length,ambiguous:amb.length,resolved,
    resolvedAccuracy:resolved?wins.length/resolved:0,balancedAccuracy:(longPrec+shortPrec)/2,
    bullPrecision:longPrec,bearPrecision:shortPrec,coverage:eligible?signals.length/eligible:0,resolutionRate:signals.length?resolved/signals.length:0,
    expectancy:mean(signals.map(x=>x.ret)),profitFactor:neg?pos/neg:(pos>0?99:0),avgMfe:mean(signals.map(x=>x.mfe)),avgMae:mean(signals.map(x=>x.mae)),
    avgBars:mean(signals.map(x=>x.bars)),signalDrawdown:maxDrawdown(signals.map(x=>x.ret))
  };
}
function evaluate(cs,rows,o,w=DEFAULT_WEIGHTS,start=210,end=null){
  const last=Math.min(end??(cs.length-o.horizon-1),cs.length-o.horizon-1),signals=[];let eligible=0;
  for(let i=Math.max(210,start);i<=last;i++){
    const row=rows[i];if(!row||!Number.isFinite(row.atr))continue;eligible++;
    const score=composite(row,w);let dir=0;if(score>=o.bull)dir=1;else if(score<=o.bear)dir=-1;else continue;
    const out=barrierOutcome(cs,i,dir,row.atr,o);
    signals.push({i,time:cs[i].time,score,dir,session:row.session,regime:row.adx>=25?'Trending':row.adx<18?'Ranging':'Mixed',...out});
  }
  return metricsFromSignals(signals,eligible);
}
function objective(m,penalty=0){
  if(m.resolved<25)return -999;
  const pf=Math.min(m.profitFactor,3)/3;
  const coverage=Math.min(m.coverage,.5)/.5;
  return m.balancedAccuracy*.40+m.resolvedAccuracy*.22+pf*.14+coverage*.07+Math.min(Math.max(m.expectancy*40,0),.07)+m.resolutionRate*.10-penalty;
}
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function normalize(raw){const sum=Object.values(raw).reduce((a,b)=>a+b,0),o={};for(const k in raw)o[k]=raw[k]/sum*100;return o;}
function regularizationPenalty(w,maxDev){
  let p=0,n=0;
  for(const k in DEFAULT_WEIGHTS){const d=Math.abs(w[k]-DEFAULT_WEIGHTS[k])/DEFAULT_WEIGHTS[k];p+=Math.max(0,d-maxDev*.65);n++;}
  return p/n*.08;
}
function optimize(cs,rows,o,start,end,seed,candidates=150){
  const rnd=seeded(seed),maxDev=o.weightDeviation;
  let bestW={...DEFAULT_WEIGHTS},bestM=evaluate(cs,rows,o,bestW,start,end),best=objective(bestM,0);
  for(let z=0;z<candidates;z++){
    const raw={};
    for(const k in DEFAULT_WEIGHTS){
      const d=(rnd()*2-1)*maxDev;
      raw[k]=DEFAULT_WEIGHTS[k]*(1+d);
    }
    const w=normalize(raw),m=evaluate(cs,rows,o,w,start,end),obj=objective(m,regularizationPenalty(w,maxDev));
    if(obj>best){best=obj;bestW=w;bestM=m;}
  }
  return{weights:bestW,metrics:bestM,objective:best};
}
function purgedWalkForward(cs,rows,o){
  const warm=230,N=cs.length-o.horizon-1,usable=N-warm,testSize=Math.max(90,Math.floor(usable*.11)),folds=[];
  for(let f=0;f<4;f++){
    const testStart=warm+Math.floor(usable*.45)+f*testSize;
    if(testStart+testSize>N)break;
    const purge=o.horizon+o.embargo,trainStart=warm,trainEnd=testStart-purge-1,testEnd=testStart+testSize-1;
    if(trainEnd-trainStart<250)continue;
    const opt=optimize(cs,rows,o,trainStart,trainEnd,321+f,130),test=evaluate(cs,rows,o,opt.weights,testStart,testEnd);
    folds.push({fold:f+1,trainStart,trainEnd,testStart,testEnd,purge,train:opt.metrics,test,weights:opt.weights});
  }
  const avgWeights={};for(const k in DEFAULT_WEIGHTS)avgWeights[k]=mean(folds.map(x=>x.weights[k]));
  return{
    folds,avgWeights,
    agg:{
      folds:folds.length,
      trainResolved:mean(folds.map(x=>x.train.resolvedAccuracy)),
      testResolved:mean(folds.map(x=>x.test.resolvedAccuracy)),
      trainBalanced:mean(folds.map(x=>x.train.balancedAccuracy)),
      testBalanced:mean(folds.map(x=>x.test.balancedAccuracy)),
      testPF:mean(folds.map(x=>x.test.profitFactor)),
      testExpectancy:mean(folds.map(x=>x.test.expectancy)),
      testSignals:folds.reduce((s,x)=>s+x.test.n,0),
      testResolvedN:folds.reduce((s,x)=>s+x.test.resolved,0),
      overfitGap:mean(folds.map(x=>x.train.balancedAccuracy-x.test.balancedAccuracy)),
      resolutionRate:mean(folds.map(x=>x.test.resolutionRate))
    }
  };
}
function thresholdSweep(cs,rows,o,w){
  return[55,60,65,70,75,80].map(t=>({threshold:t,bear:100-t,...evaluate(cs,rows,{...o,bull:t,bear:100-t},w)}));
}
function calibration(signals){
  const bands=[[50,55],[55,60],[60,65],[65,70],[70,75],[75,80],[80,101]],out=[];
  for(const [a,b] of bands){
    const x=signals.filter(s=>Math.max(s.score,100-s.score)>=a&&Math.max(s.score,100-s.score)<b);
    const r=x.filter(s=>s.outcome==='win'||s.outcome==='loss'),w=r.filter(s=>s.outcome==='win').length;
    out.push({band:`${a}-${b===101?'100':b}`,n:x.length,resolved:r.length,accuracy:r.length?w/r.length:0,expectancy:mean(x.map(s=>s.ret))});
  }
  return out;
}
function groupMetrics(signals,key){
  const g={};for(const s of signals)(g[s[key]]??=[]).push(s);
  return Object.entries(g).map(([name,a])=>{const m=metricsFromSignals(a,a.length);return{name,...m};}).sort((a,b)=>b.n-a.n);
}

async function fetchHistory(symbol,interval,market,total){
  const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,''),base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
  let end=Date.now(),all=[];
  while(all.length<total){
    const limit=Math.min(1000,total-all.length),u=`${base}?symbol=${encodeURIComponent(clean)}&interval=${interval}&limit=${limit}&endTime=${end}`;
    const r=await fetch(u),d=await r.json();if(!r.ok||!Array.isArray(d))throw new Error(d?.msg||'تعذر جلب Binance.');
    if(!d.length)break;
    const b=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
    all=[...b,...all];end=b[0].time-1;$('status').textContent=`تحميل ${symbol} ${interval}: ${all.length}/${total}`;
    if(b.length<limit)break;
  }
  const seen=new Set();return all.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time).slice(-total);
}
function parseCsv(text){
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
  const split=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===','&&!q){o.push(c);c='';}else c+=ch;}o.push(c);return o;};
  const h=split(lines[0]).map(x=>x.trim().toLowerCase()),ix=ns=>ns.map(n=>h.indexOf(n)).find(i=>i>=0);
  const ti=ix(['time','timestamp','date','datetime']),oi=ix(['open']),hi=ix(['high']),li=ix(['low']),ci=ix(['close']),vi=ix(['volume','vol']);
  if([ti,oi,hi,li,ci].some(x=>x===undefined))throw new Error('CSV يحتاج Time/Open/High/Low/Close.');
  return lines.slice(1).map(l=>{const p=split(l);let t=+p[ti];if(!Number.isFinite(t)||t<1e9)t=Date.parse(p[ti]);if(t<1e11)t*=1000;return{time:t,open:+p[oi],high:+p[hi],low:+p[li],close:+p[ci],volume:vi===undefined?0:+p[vi]};}).filter(c=>Object.values(c).every(Number.isFinite)).sort((a,b)=>a.time-b.time);
}
function options(){
  return{horizon:+$('horizon').value,tpAtr:+$('tpAtr').value,slAtr:+$('slAtr').value,embargo:+$('embargo').value,bull:+$('bullThreshold').value,bear:+$('bearThreshold').value,weightDeviation:+$('weightDeviation').value,sameBarPolicy:$('sameBarPolicy').value};
}

async function prepareCrypto(symbol,tf,market,total){
  const main=await fetchHistory(symbol,tf,market,total),rows=baseFeatureMatrix(main);
  const hsets=[];
  for(const [htf,duration] of higherDefs(tf)){
    const need=htf==='1w'?420:520;
    const candles=await fetchHistory(symbol,htf,market,need);
    hsets.push({tf:htf,duration,candles});
  }
  addMtfContext(main,rows,hsets);

  // Same-timeframe benchmark history for relative strength.
  const bench=[];
  for(const s of ['BTCUSDT','ETHUSDT']){
    try{bench.push({symbol:s,candles:await fetchHistory(s,tf,'spot',total)});}catch{}
  }
  addRelative(main,rows,bench,symbol.toUpperCase());
  return{main,rows};
}
function prepareForex(cs,tf){
  const rows=baseFeatureMatrix(cs),sets=[];
  for(const [htf,duration] of higherDefs(tf)){
    const rs=resample(cs,htf);
    if(rs.length>60)sets.push({tf:htf,duration,candles:rs});
  }
  addMtfContext(cs,rows,sets);
  return{main:cs,rows};
}
function saveRun(report){
  const key='trendV52Runs',all=JSON.parse(localStorage.getItem(key)||'{}');
  all[`${report.symbol}|${report.tf}`]={symbol:report.symbol,tf:report.tf,when:new Date().toISOString(),resolvedAccuracy:report.optimized.resolvedAccuracy,balancedAccuracy:report.optimized.balancedAccuracy,profitFactor:report.optimized.profitFactor,expectancy:report.optimized.expectancy,wfBalanced:report.wf.agg.testBalanced,wfPF:report.wf.agg.testPF,overfitGap:report.wf.agg.overfitGap,signals:report.optimized.n};
  localStorage.setItem(key,JSON.stringify(all));
}
function getSavedRuns(){return Object.values(JSON.parse(localStorage.getItem('trendV52Runs')||'{}')).sort((a,b)=>a.symbol.localeCompare(b.symbol));}

async function runResearch(main,rows,symbol,tf,source){
  if(main.length<650)throw new Error('يفضل V5.2 تاريخًا ≥ 650 شمعة. المتاح: '+main.length);
  const o=options();$('status').textContent='Baseline Triple‑Barrier...';await new Promise(r=>setTimeout(r,20));
  const baseline=evaluate(main,rows,o,DEFAULT_WEIGHTS);
  $('status').textContent='Purged Walk‑Forward + Regularized Optimization...';await new Promise(r=>setTimeout(r,20));
  const wf=purgedWalkForward(main,rows,o);
  const optimized=evaluate(main,rows,o,wf.avgWeights);
  const report={symbol,tf,source,candles:main.length,o,baseline,wf,optimized,weights:wf.avgWeights,thresholds:thresholdSweep(main,rows,o,wf.avgWeights),calibration:calibration(optimized.signals),sessions:groupMetrics(optimized.signals,'session'),regimes:groupMetrics(optimized.signals,'regime')};
  saveRun(report);render(report);$('status').textContent='اكتمل V5.2.';
}
$('runCryptoBtn').onclick=async()=>{
  const b=$('runCryptoBtn');b.disabled=true;
  try{
    const symbol=$('symbol').value.trim().toUpperCase(),tf=$('timeframe').value,market=$('market').value,total=+$('historySize').value;
    const p=await prepareCrypto(symbol,tf,market,total);await runResearch(p.main,p.rows,symbol,tf,`Binance ${market}`);
  }catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}
};
$('runForexBtn').onclick=async()=>{
  const f=$('forexCsv').files[0];if(!f){$('status').textContent='اختر CSV أولًا.';return;}
  const b=$('runForexBtn');b.disabled=true;
  try{const cs=parseCsv(await f.text()),tf=$('forexTf').value,p=prepareForex(cs,tf);await runResearch(p.main,p.rows,$('forexSymbol').value.trim(),tf,'Forex CSV');}
  catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}
};

function metric(label,value,cls=''){return`<div class="metric"><small>${label}</small><b class="${cls}">${value}</b></div>`;}
function qcls(v){return v>=.56?'good':v>=.50?'warn':'bad';}
function pfcls(v){return v>=1.15?'good':v>=.95?'warn':'bad';}
function render(r){
  ['summaryCard','baselineCard','wfCard','barrierCard','weightsCard','thresholdCard','calibrationCard','sessionCard','regimeCard','robustnessCard'].forEach(id=>$(id).classList.remove('hidden'));
  $('coreGrid').classList.remove('hidden');$('regimeGrid').classList.remove('hidden');
  const m=r.optimized,w=r.wf.agg,gap=w.overfitGap;
  $('summaryCard').innerHTML=`<h2>${esc(r.symbol)} — ${esc(r.tf)} — V5.2</h2>
    <div class="score ${qcls(m.balancedAccuracy)}">${(m.balancedAccuracy*100).toFixed(1)}%</div>
    <strong>Balanced Accuracy — Triple‑Barrier resolved outcomes</strong>
    <p class="muted">${esc(r.source)} • ${r.candles} candles • TP ${r.o.tpAtr} ATR • SL ${r.o.slAtr} ATR • Max ${r.o.horizon} bars • Purge ${r.o.horizon+r.o.embargo} bars</p>
    <div class="note ${gap<.05?'good':gap<.10?'warn':'bad'}">Out‑of‑sample Balanced Accuracy ${(w.testBalanced*100).toFixed(1)}% • Overfit gap ${(gap*100).toFixed(1)}% • Test Profit Factor ${fmt(w.testPF,2)}</div>`;

  $('baselineCard').innerHTML=`<h2>Default Weights</h2><div class="metrics">
    ${metric('Signals',r.baseline.n)}${metric('Resolved accuracy',(r.baseline.resolvedAccuracy*100).toFixed(1)+'%',qcls(r.baseline.resolvedAccuracy))}
    ${metric('Balanced accuracy',(r.baseline.balancedAccuracy*100).toFixed(1)+'%',qcls(r.baseline.balancedAccuracy))}${metric('Resolution rate',(r.baseline.resolutionRate*100).toFixed(1)+'%')}
    ${metric('Bull precision',(r.baseline.bullPrecision*100).toFixed(1)+'%')}${metric('Bear precision',(r.baseline.bearPrecision*100).toFixed(1)+'%')}
    ${metric('Profit factor',fmt(r.baseline.profitFactor,2),pfcls(r.baseline.profitFactor))}${metric('Expectancy',pct(r.baseline.expectancy))}
  </div>`;

  $('wfCard').innerHTML=`<h2>Purged Walk‑Forward</h2><div class="metrics">
    ${metric('Folds',w.folds)}${metric('Test resolved N',w.testResolvedN)}
    ${metric('Train balanced',(w.trainBalanced*100).toFixed(1)+'%')}${metric('Out-of-sample balanced',(w.testBalanced*100).toFixed(1)+'%',qcls(w.testBalanced))}
    ${metric('Out-of-sample resolved',(w.testResolved*100).toFixed(1)+'%')}${metric('Test PF',fmt(w.testPF,2),pfcls(w.testPF))}
    ${metric('Test expectancy',pct(w.testExpectancy))}${metric('Overfit gap',(w.overfitGap*100).toFixed(1)+'%',w.overfitGap<.05?'good':w.overfitGap<.10?'warn':'bad')}
  </div>`;

  $('barrierCard').innerHTML=`<h2>Triple‑Barrier Outcomes</h2><div class="metrics">
    ${metric('Wins',m.wins)}${metric('Losses',m.losses)}
    ${metric('Timeouts',m.timeouts)}${metric('Ambiguous',m.ambiguous)}
    ${metric('Resolution rate',(m.resolutionRate*100).toFixed(1)+'%')}${metric('Coverage',(m.coverage*100).toFixed(1)+'%')}
    ${metric('Avg MFE',pct(m.avgMfe))}${metric('Avg MAE',pct(m.avgMae))}
    ${metric('Avg bars',fmt(m.avgBars,1))}${metric('Signal-sequence DD',pct(m.signalDrawdown))}
  </div><p class="muted">Ambiguous تعني أن الشمعة نفسها لمست الحاجزين ولا نعرف ترتيب الحركة داخل الشمعة من OHLC وحده.</p>`;

  const labels={structure:'Structure',trend:'Trend',momentum:'Momentum',strength:'ADX Strength',volumeFlow:'Volume/VWAP',liquidity:'Liquidity/CHoCH/FVG',mtf:'MTF Context',relative:'Relative BTC/ETH',time:'Session Time'};
  $('weightsCard').innerHTML=`<h2>Regularized Adaptive Weights</h2><p class="muted">التحسين مقيد حول Default بمقدار ${Math.round(r.o.weightDeviation*100)}% لتقليل Overfitting.</p>`+
    Object.keys(DEFAULT_WEIGHTS).map(k=>`<div class="weightrow"><b>${labels[k]}</b><div class="bar"><div style="width:${Math.min(100,r.weights[k]*3.4)}%"></div></div><span>${DEFAULT_WEIGHTS[k].toFixed(1)}</span><strong>${fmt(r.weights[k],1)}</strong></div>`).join('');

  $('thresholdCard').innerHTML=`<h2>Triple‑Barrier Threshold Sweep</h2><div class="tablewrap"><table><thead><tr><th>Bull/Bear</th><th>Signals</th><th>Resolved</th><th>Balanced</th><th>Bull P</th><th>Bear P</th><th>PF</th><th>Expectancy</th></tr></thead><tbody>`+
    r.thresholds.map(x=>`<tr><td>${x.threshold}/${x.bear}</td><td>${x.n}</td><td>${(x.resolvedAccuracy*100).toFixed(1)}%</td><td>${(x.balancedAccuracy*100).toFixed(1)}%</td><td>${(x.bullPrecision*100).toFixed(1)}%</td><td>${(x.bearPrecision*100).toFixed(1)}%</td><td>${fmt(x.profitFactor,2)}</td><td>${pct(x.expectancy)}</td></tr>`).join('')+
    `</tbody></table></div>`;

  $('calibrationCard').innerHTML=`<h2>Score Calibration</h2><p class="muted">هل ارتفاع قوة الـScore يؤدي فعلًا إلى ارتفاع نسبة النجاح؟ هذه أهم قراءة قبل اعتبار 80 أقوى من 70.</p>`+
    r.calibration.map(x=>`<div class="weightrow"><b>${x.band}</b><div class="calbar"><div style="width:${x.accuracy*100}%"></div></div><span>${x.resolved}</span><strong class="${qcls(x.accuracy)}">${(x.accuracy*100).toFixed(1)}%</strong></div>`).join('');

  function groupTable(title,rows){
    return `<h2>${title}</h2><div class="tablewrap"><table><thead><tr><th>Group</th><th>N</th><th>Resolved Acc</th><th>Balanced</th><th>PF</th><th>Expectancy</th><th>Resolution</th></tr></thead><tbody>`+
      rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.n}</td><td>${(x.resolvedAccuracy*100).toFixed(1)}%</td><td>${(x.balancedAccuracy*100).toFixed(1)}%</td><td>${fmt(x.profitFactor,2)}</td><td>${pct(x.expectancy)}</td><td>${(x.resolutionRate*100).toFixed(1)}%</td></tr>`).join('')+
      `</tbody></table></div>`;
  }
  $('sessionCard').innerHTML=groupTable('Performance by Session',r.sessions);
  $('regimeCard').innerHTML=groupTable('Performance by Regime',r.regimes);

  const saved=getSavedRuns();
  $('robustnessCard').innerHTML=`<h2>Cross‑Asset Robustness — Saved Runs</h2><p class="muted">شغّل نفس الإعدادات على BTCUSDT وETHUSDT وADAUSDT؛ يحتفظ الهاتف بآخر نتيجة لكل رمز/فريم.</p><div class="robust-grid">`+
    saved.map(x=>`<div class="robust"><strong>${esc(x.symbol)} — ${esc(x.tf)}</strong><div class="${qcls(x.wfBalanced)}">WF Balanced ${(x.wfBalanced*100).toFixed(1)}%</div><div class="${pfcls(x.wfPF)}">WF PF ${fmt(x.wfPF,2)}</div><div>Resolved ${(x.resolvedAccuracy*100).toFixed(1)}%</div><div>Expectancy ${pct(x.expectancy)}</div><div class="small">Overfit gap ${(x.overfitGap*100).toFixed(1)}% • Signals ${x.signals}</div></div>`).join('')+
    `</div>`;
}
