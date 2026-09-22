(function(root){
'use strict';

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const median=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));

function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;const k=2/(p+1);let z=mean(v.slice(0,p));o[p-1]=z;for(let i=p;i<v.length;i++){z=v[i]*k+z*(1-k);o[i]=z;}return o;}
function sma(v,p){const o=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)o[i]=s/p;}return o;}
function rsi(c,p=14){const o=Array(c.length).fill(null);if(c.length<=p)return o;const g=[],l=[];for(let i=1;i<c.length;i++){const d=c[i]-c[i-1];g.push(Math.max(d,0));l.push(Math.max(-d,0));}let ag=mean(g.slice(0,p)),al=mean(l.slice(0,p));const f=()=>al===0?100:100-100/(1+ag/al);o[p]=f();for(let i=p+1;i<c.length;i++){ag=(ag*(p-1)+g[i-1])/p;al=(al*(p-1)+l[i-1])/p;o[i]=f();}return o;}
function atr(cs,p=14){const tr=cs.map((c,i)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-cs[i-1].close),Math.abs(c.low-cs[i-1].close)));const o=Array(cs.length).fill(null);if(cs.length<p)return o;let x=mean(tr.slice(0,p));o[p-1]=x;for(let i=p;i<cs.length;i++){x=(x*(p-1)+tr[i])/p;o[i]=x;}return o;}
function wilder(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let s=v.slice(0,p).reduce((a,b)=>a+b,0);o[p-1]=s;for(let i=p;i<v.length;i++){s=s-s/p+(v[i]||0);o[i]=s;}return o;}
function adx(cs,p=14){const n=cs.length,pd=Array(n).fill(0),md=Array(n).fill(0),tr=Array(n).fill(0);for(let i=1;i<n;i++){const up=cs[i].high-cs[i-1].high,dn=cs[i-1].low-cs[i].low;pd[i]=up>dn&&up>0?up:0;md[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(cs[i].high-cs[i].low,Math.abs(cs[i].high-cs[i-1].close),Math.abs(cs[i].low-cs[i-1].close));}const t=wilder(tr.slice(1),p),pp=wilder(pd.slice(1),p),mm=wilder(md.slice(1),p),plus=Array(n).fill(null),minus=Array(n).fill(null),dx=Array(n).fill(null),ao=Array(n).fill(null);for(let j=p-1;j<t.length;j++){const i=j+1;if(!t[j])continue;plus[i]=100*pp[j]/t[j];minus[i]=100*mm[j]/t[j];const den=plus[i]+minus[i];dx[i]=den?100*Math.abs(plus[i]-minus[i])/den:0;}const vals=[],idx=[];for(let i=0;i<n;i++)if(dx[i]!=null){vals.push(dx[i]);idx.push(i);}if(vals.length>=p){let a=mean(vals.slice(0,p));ao[idx[p-1]]=a;for(let k=p;k<vals.length;k++){a=(a*(p-1)+vals[k])/p;ao[idx[k]]=a;}}return{adx:ao,plus,minus};}
function macd(c){const f=ema(c,12),s=ema(c,26),line=c.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),compact=line.filter(x=>x!=null),sigc=ema(compact,9),signal=Array(c.length).fill(null);let j=0;for(let i=0;i<c.length;i++)if(line[i]!=null)signal[i]=sigc[j++]??null;return{line,signal,hist:line.map((x,i)=>x!=null&&signal[i]!=null?x-signal[i]:null)};}
function ichimoku(cs){const mid=(i,p)=>{if(i<p-1)return null;let hi=-Infinity,lo=Infinity;for(let j=i-p+1;j<=i;j++){hi=Math.max(hi,cs[j].high);lo=Math.min(lo,cs[j].low);}return(hi+lo)/2;};const t=[],k=[],a=[],b=[];for(let i=0;i<cs.length;i++){const x=mid(i,9),y=mid(i,26);t.push(x);k.push(y);a.push(x!=null&&y!=null?(x+y)/2:null);b.push(mid(i,52));}return{tenkan:t,kijun:k,spanA:a,spanB:b};}
function confirmedPivots(cs,l=3,r=3){const hs=[],ls=[];for(let i=l;i<cs.length-r;i++){let h=true,lo=true;for(let j=i-l;j<=i+r;j++){if(j===i)continue;if(cs[j].high>=cs[i].high)h=false;if(cs[j].low<=cs[i].low)lo=false;}if(h)hs.push({i,confirmed:i+r,price:cs[i].high});if(lo)ls.push({i,confirmed:i+r,price:cs[i].low});}return{hs,ls};}
function lastNN(a){for(let i=a.length-1;i>=0;i--)if(a[i]!=null&&Number.isFinite(a[i]))return a[i];return null;}
function separatedTouches(cs,level,tol,kind){
 let n=0,last=-99;
 for(let i=Math.max(0,cs.length-100);i<cs.length;i++){
   const hit=kind==='R'?Math.abs(cs[i].high-level)<=tol:Math.abs(cs[i].low-level)<=tol;
   if(hit&&i-last>=4){n++;last=i;}
 }
 return n;
}
function wilsonLower95(wins,n){if(!n)return 0;const z=1.96,p=wins/n,z2=z*z,den=1+z2/n;return(p+z2/(2*n)-z*Math.sqrt((p*(1-p)+z2/(4*n))/n))/den;}

function validationSpec(tf){
 if(tf==='M15')return{history:4000,minN:80,step:4,horizon:16,purge:16,folds:4};
 if(tf==='H1')return{history:4000,minN:50,step:3,horizon:12,purge:12,folds:4};
 return{history:2500,minN:30,step:1,horizon:8,purge:8,folds:4};
}

function technicalCore(cs){
 if(!Array.isArray(cs)||cs.length<220)throw new Error('Insufficient candles for Technical Engine');
 const c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),R=rsi(c),A=adx(cs),M=macd(c),I=ichimoku(cs),AT=atr(cs),vma=sma(v,20),piv=confirmedPivots(cs),last=cs.at(-1),i=cs.length-1;
 const E20=lastNN(e20),E50=lastNN(e50),E200=lastNN(e200),rv=lastNN(R),adxv=lastNN(A.adx),p=lastNN(A.plus),m=lastNN(A.minus),atrv=lastNN(AT),ten=lastNN(I.tenkan),kij=lastNN(I.kijun),sa=lastNN(I.spanA),sb=lastNN(I.spanB),mac=lastNN(M.line),sig=lastNN(M.signal),hist=lastNN(M.hist),vr=vma[i]?last.volume/vma[i]:1;

 let emaTrend=50;
 if(last.close>E20&&E20>E50&&E50>E200)emaTrend=92;
 else if(last.close>E50&&E50>E200)emaTrend=74;
 else if(last.close<E20&&E20<E50&&E50<E200)emaTrend=8;
 else if(last.close<E50&&E50<E200)emaTrend=26;

 const top=Math.max(sa,sb),bot=Math.min(sa,sb);
 let ichi=50;
 if(last.close>top&&ten>kij)ichi=92;
 else if(last.close>top)ichi=72;
 else if(last.close<bot&&ten<kij)ichi=8;
 else if(last.close<bot)ichi=28;
 const trend=(emaTrend+ichi)/2;

 let rsiScore=rv>=60?86:rv>=55?74:rv>=50?61:rv>=45?39:rv>=40?26:14;
 const macdScore=mac>sig&&hist>0?84:mac>sig?68:mac<sig&&hist<0?16:32;
 const momentum=(rsiScore+macdScore)/2;

 let strength=50;
 if(adxv>=25&&p>m)strength=88;
 else if(adxv>=20&&p>m)strength=70;
 else if(adxv>=25&&m>p)strength=12;
 else if(adxv>=20&&m>p)strength=30;

 const ah=piv.hs.filter(x=>x.confirmed<=i),al=piv.ls.filter(x=>x.confirmed<=i);
 let structure=50,structureState='Unclear / transition';
 if(ah.length>=2&&al.length>=2){
   const hh=ah.at(-1).price>ah.at(-2).price,hl=al.at(-1).price>al.at(-2).price,lh=ah.at(-1).price<ah.at(-2).price,ll=al.at(-1).price<al.at(-2).price;
   if(hh&&hl){structure=92;structureState='HH / HL — bullish structure';}
   else if(lh&&ll){structure=8;structureState='LH / LL — bearish structure';}
   else if(hh&&ll){structure=62;structureState='HH / LL — expanding / mixed';}
   else if(lh&&hl){structure=38;structureState='LH / HL — compression';}
 }

 let volumeFlow=50;
 if(vr>=1.5&&last.close>last.open)volumeFlow=88;
 else if(vr>=1.2&&last.close>last.open)volumeFlow=72;
 else if(vr>=1.5&&last.close<last.open)volumeFlow=12;
 else if(vr>=1.2&&last.close<last.open)volumeFlow=28;

 const resistance=ah.length?ah.at(-1).price:Math.max(...cs.slice(-30).map(x=>x.high));
 const support=al.length?al.at(-1).price:Math.min(...cs.slice(-30).map(x=>x.low));
 const prev=cs.at(-2);
 const range=Math.max(1e-12,resistance-support);
 let srBreakout=clamp(100*(last.close-support)/range);
 const brokeUp=last.close>resistance&&prev?.close<=resistance;
 const brokeDown=last.close<support&&prev?.close>=support;
 const retestUp=cs.slice(-4,-1).some(x=>x.low<=resistance&&x.close>=resistance);
 const retestDown=cs.slice(-4,-1).some(x=>x.high>=support&&x.close<=support);
 if(brokeUp)srBreakout=retestUp?94:86;
 if(brokeDown)srBreakout=retestDown?6:14;

 const components={structure,trend,momentum,strength,volumeFlow,srBreakout};
 const baseScore=structure*.25+trend*.20+momentum*.12+strength*.10+volumeFlow*.12+srBreakout*.11;
 const baseWeight=.90;
 const h=new Date(last.time).getUTCHours(),session=h<7?'Asia':h<13?'London':h<16?'London/NY Overlap':h<21?'New York':'Late',regime=adxv>=25?'Trending':adxv<18?'Ranging':'Mixed';
 const levelTol=Math.max((atrv||last.close*.01)*.22,last.close*.0008);
 const resistanceTouches=separatedTouches(cs,resistance,levelTol,'R'),supportTouches=separatedTouches(cs,support,levelTol,'S');
 const resistanceStrength=clamp(28+resistanceTouches*16+(structure>=80?10:0)+(adxv>=25?8:0));
 const supportStrength=clamp(28+supportTouches*16+(structure<=20?10:0)+(adxv>=25?8:0));
 const candleRange=Math.max(last.high-last.low,1e-12),candleBodyAtr=Math.abs(last.close-last.open)/Math.max(atrv||last.close*.002,1e-12),closeLocationLong=(last.close-last.low)/candleRange,closeLocationShort=(last.high-last.close)/candleRange;

 return{
   price:last.close,components,baseScore,baseWeight,
   structure,structureState,trend,momentum,strength,volumeFlow,srBreakout,
   rsi:rv,adx:adxv,atr:atrv,ema20:E20,ema50:E50,ema200:E200,macd:mac,macdSignal:sig,volumeRatio:vr,
   support,resistance,resistanceTouches,supportTouches,resistanceStrength,supportStrength,candleBodyAtr,closeLocationLong,closeLocationShort,session,regime,barTime:last.time,barCloseTime:last.closeTime
 };
}

const normBase=a=>a?clamp(a.baseScore/Math.max(a.baseWeight||.90,1e-9)):50;

/*
 Timeframe-specific hierarchy:
 M15 = execution/timing frame. Context comes from H1 primarily + D1.
 H1  = signal frame. Directional context comes from D1 only; M15 cannot rewrite H1.
 D1  = primary direction. Its score is self-contained; H1 is timing, not a directional veto.
*/
function contextScore(tf,cores){
 if(tf==='M15')return normBase(cores.H1)*.75+normBase(cores.D1)*.25;
 if(tf==='H1')return normBase(cores.D1);
 return normBase(cores.D1);
}

function finalizeOne(tf,base,cores){
 const mtf=contextScore(tf,cores);
 const score=tf==='D1'?normBase(base):clamp(base.baseScore+mtf*.10);
 const side=score>=65?1:score<=35?-1:0;
 return{...base,score,side,mtf,session:tf==='D1'?'N/A — Daily timeframe':base.session};
}

function finalizeCurrent(sets){
 const base={};
 for(const k of ['M15','H1','D1']){
   const cs=sets[k];
   if(Array.isArray(cs)&&cs.length>=220)base[k]=technicalCore(cs);
 }
 if(!base.D1)throw new Error('D1 history is required');
 const finals={};
 finals.D1=finalizeOne('D1',base.D1,base);
 if(base.H1)finals.H1=finalizeOne('H1',base.H1,{...base,D1:base.D1});
 if(base.M15&&base.H1)finals.M15=finalizeOne('M15',base.M15,{...base,H1:base.H1,D1:base.D1});
 return finals;
}

function higherTfVeto(tf,side,cores){
 if(!side)return false;
 if(tf==='M15'){
   if(!cores.H1||!cores.D1)return true;
   if(side===1&&(cores.H1.score<=35||cores.D1.score<=25))return true;
   if(side===-1&&(cores.H1.score>=65||cores.D1.score>=75))return true;
 }
 if(tf==='H1'){
   if(!cores.D1)return true;
   if(side===1&&cores.D1.score<=35)return true;
   if(side===-1&&cores.D1.score>=65)return true;
 }
 return false;
}

function lastIndexClosedAtOrBefore(cs,closeTime){
 let lo=0,hi=cs.length-1,ans=-1;
 while(lo<=hi){
   const m=(lo+hi)>>1;
   if((cs[m].closeTime||0)<=closeTime){ans=m;lo=m+1;}else hi=m-1;
 }
 return ans;
}
function historicalCoreAt(cs,idx){
 if(!Array.isArray(cs)||idx<259)return null;
 return technicalCore(cs.slice(Math.max(0,idx-319),idx+1));
}

function historicalSnapshot(sets,tf,i){
 const selected=sets[tf],bar=selected?.[i];
 if(!bar)return null;
 const t=bar.closeTime||bar.time,idx={},base={},finals={};

 if(tf==='H1'){
   idx.H1=i; idx.D1=lastIndexClosedAtOrBefore(sets.D1||[],t);
   if(idx.H1<259||idx.D1<259)return null;
   base.H1=historicalCoreAt(sets.H1,idx.H1); base.D1=historicalCoreAt(sets.D1,idx.D1);
   if(!base.H1||!base.D1)return null;
   finals.D1=finalizeOne('D1',base.D1,base);
   finals.H1=finalizeOne('H1',base.H1,base);
 }else if(tf==='M15'){
   idx.M15=i; idx.H1=lastIndexClosedAtOrBefore(sets.H1||[],t); idx.D1=lastIndexClosedAtOrBefore(sets.D1||[],t);
   if(idx.M15<259||idx.H1<259||idx.D1<259)return null;
   base.M15=historicalCoreAt(sets.M15,idx.M15); base.H1=historicalCoreAt(sets.H1,idx.H1); base.D1=historicalCoreAt(sets.D1,idx.D1);
   if(!base.M15||!base.H1||!base.D1)return null;
   finals.D1=finalizeOne('D1',base.D1,base);
   finals.H1=finalizeOne('H1',base.H1,base);
   finals.M15=finalizeOne('M15',base.M15,base);
 }else{
   idx.D1=i;
   if(idx.D1<259)return null;
   base.D1=historicalCoreAt(sets.D1,idx.D1);
   if(!base.D1)return null;
   finals.D1=finalizeOne('D1',base.D1,base);
 }
 const a=finals[tf],veto=higherTfVeto(tf,a.side,finals);
 return{a,cores:finals,idx,veto};
}

function fullStartIndex(sets,tf){
 const cs=sets[tf]||[];
 for(let i=330;i<cs.length;i++)if(historicalSnapshot(sets,tf,i))return i;
 return -1;
}

function barrierOutcomeDetailed(cs,i,dir,atrv,h=12,costBps=10){
 const entry=cs[i].close,F=dir===1?entry+atrv:entry-atrv,A=dir===1?entry-atrv:entry+atrv;
 const riskPct=atrv/Math.max(entry,1e-12),costPct=costBps/10000,costR=riskPct>0?costPct/riskPct:0;
 for(let j=i+1;j<=Math.min(cs.length-1,i+h);j++){
   const fav=dir===1?cs[j].high>=F:cs[j].low<=F,adv=dir===1?cs[j].low<=A:cs[j].high>=A;
   if(fav&&adv)return{out:'amb',r:null};
   if(fav)return{out:'win',r:1-costR};
   if(adv)return{out:'loss',r:-(1+costR)};
 }
 return{out:'timeout',r:null};
}

function purgedWalkForward(sets,tf,costBps=10){
 const cs=sets[tf]||[],spec=validationSpec(tf),AT=atr(cs),rows=[],signalRows=[],fullStart=fullStartIndex(sets,tf);
 const empty={n:0,wins:0,losses:0,acc:0,pf:0,wilson:0,avgR:0};
 if(fullStart<0)return{long:{...empty},short:{...empty},folds:[],foldsLong:[],foldsShort:[],spec,testN:0,costBps,overlapN:0,validationMode:validationMode(tf)};
 for(let i=fullStart;i<cs.length-spec.horizon;i+=spec.step){
   const snap=historicalSnapshot(sets,tf,i);
   if(!snap||snap.veto||!snap.a.side||!AT[i])continue;
   signalRows.push({i,dir:snap.a.side,a:snap.a});
   const o=barrierOutcomeDetailed(cs,i,snap.a.side,AT[i],spec.horizon,costBps);
   if(o.out==='amb'||o.out==='timeout')continue;
   rows.push({i,dir:snap.a.side,out:o.out,r:o.r});
 }
 const first=Math.max(fullStart,Math.floor(fullStart+(cs.length-fullStart)*.40)),span=Math.max(1,cs.length-first),foldSize=Math.max(1,Math.floor(span/spec.folds)),testRows=[],testSignals=[];
 const foldRanges=[],foldSignalRanges=[];
 for(let f=0;f<spec.folds;f++){
   const rawStart=first+f*foldSize,rawEnd=f===spec.folds-1?cs.length-1:first+(f+1)*foldSize-1;
   const start=rawStart+spec.purge,end=rawEnd-spec.horizon;
   const fold=rows.filter(x=>x.i>=start&&x.i<=end);
   const foldSignals=signalRows.filter(x=>x.i>=start&&x.i<=end).map(x=>({...x,fold:f,foldStart:start,foldEnd:end,foldRawEnd:rawEnd}));
   testRows.push(...fold);foldRanges.push(fold);
   testSignals.push(...foldSignals);foldSignalRanges.push(foldSignals);
 }
 function side(dir){
   const r=testRows.filter(x=>x.dir===dir),wins=r.filter(x=>x.out==='win').length,losses=r.filter(x=>x.out==='loss').length,n=wins+losses;
   const gains=r.filter(x=>x.r>0).reduce((s,x)=>s+x.r,0),lossAbs=-r.filter(x=>x.r<0).reduce((s,x)=>s+x.r,0);
   const acc=n?wins/n:0,pf=lossAbs>0?gains/lossAbs:(gains>0?Infinity:0),wilson=wilsonLower95(wins,n),avgR=n?r.reduce((s,x)=>s+x.r,0)/n:0;
   return{n,wins,losses,acc,pf,wilson,avgR};
 }
 function foldSide(dir){
   return foldRanges.map(fold=>{const r=fold.filter(x=>x.dir===dir),n=r.length,w=r.filter(x=>x.out==='win').length;return{n,acc:n?w/n:0};});
 }
 return{
   long:side(1),short:side(-1),
   folds:foldRanges.map(f=>({n:f.length,acc:f.length?f.filter(x=>x.out==='win').length/f.length:0})),
   foldsLong:foldSide(1),foldsShort:foldSide(-1),
   spec,testN:testRows.length,costBps,
   overlapN:cs.length-fullStart,
   overlapStartTime:cs[fullStart]?.time||null,
   overlapEndTime:cs.at(-1)?.closeTime||null,
   validationMode:validationMode(tf),
   signalSamples:testSignals
 };
}

function validationMode(tf){
 if(tf==='H1')return'H1 signal + D1 directional confirmation/veto; M15 reserved for timing';
 if(tf==='M15')return'M15 timing + H1 confirmation + D1 higher context';
 return'D1 primary direction; lower timeframes do not rewrite D1';
}

const LIVE_POLICY={name:'Adaptive V2 Live',breakoutCloseScore:78,strongLevel:85,strongPremium:5,minBodyAtr:.35,minCloseLocation:.62,minVolumeRatio:.90};
function dirValueEntry(x,side){return side===1?x:100-x;}
function entryQualityV2(a,policy=LIVE_POLICY){
 const side=a.side||0;if(!side)return{score:50,decision:'RETEST_BIAS',reason:'NEUTRAL_DIRECTION'};
 const dStructure=dirValueEntry(a.structure,side),dTrend=dirValueEntry(a.trend,side),dMomentum=dirValueEntry(a.momentum,side),dStrength=dirValueEntry(a.strength,side),dVolume=dirValueEntry(a.volumeFlow,side),dSR=dirValueEntry(a.srBreakout,side),dMtf=dirValueEntry(a.mtf??50,side);
 let score=dStructure*.18+dTrend*.16+dMomentum*.17+dStrength*.12+dVolume*.11+dSR*.10+dMtf*.10;
 if(a.regime==='Trending')score+=6;else if(a.regime==='Ranging')score-=8;
 const levelStrength=side===1?(a.resistanceStrength||0):(a.supportStrength||0);if(levelStrength>=policy.strongLevel)score-=4;score=clamp(score);
 return{score,decision:score>=policy.breakoutCloseScore?'CLOSE_CANDIDATE':'RETEST_BIAS',reason:score>=policy.breakoutCloseScore?'PRE_BREAKOUT_QUALITY_STRONG':'PRE_BREAKOUT_RETEST_BIAS',levelStrength};
}
function paperLevels(a,policy=LIVE_POLICY){
 const atrv=Math.max(a.atr,a.price*.002),buf=.08*atrv,retestTol=.22*atrv,pre=entryQualityV2(a,policy);
 let entry,stop,tp1,tp2,mode,triggerMode,breakoutLevel,retestLow,retestHigh,entryReason;
 const levelStrength=a.side===1?(a.resistanceStrength||0):(a.supportStrength||0);
 if(a.side===1){
   breakoutLevel=a.resistance;retestLow=a.resistance-retestTol;retestHigh=a.resistance+retestTol;
   if(a.price<=a.resistance+buf){entryReason='AWAIT_BREAKOUT_QUALITY_V2';mode='Adaptive Entry V2 — closed-candle breakout, then choose momentum continuation or retest';triggerMode='ADAPTIVE_BREAKOUT_V2';entry=a.resistance+.03*atrv;}
   else if(pre.decision==='CLOSE_CANDIDATE'){entryReason='POST_BREAKOUT_HIGH_QUALITY_V2';mode='Adaptive V2 momentum continuation after confirmed close';triggerMode='BREAKOUT_CLOSE';entry=a.price+.04*atrv;}
   else{entryReason='POST_BREAKOUT_RETEST_BIAS_V2';mode='Adaptive V2 retest of broken resistance before continuation';triggerMode='RETEST_AFTER_BREAKOUT';entry=a.resistance+.03*atrv;}
   const structural=Math.min(a.support-.10*atrv,entry-.90*atrv);let risk=entry-structural;risk=Math.max(.90*atrv,Math.min(risk,1.80*atrv));stop=entry-risk;tp1=entry+1.20*risk;tp2=entry+2.00*risk;
 }else{
   breakoutLevel=a.support;retestLow=a.support-retestTol;retestHigh=a.support+retestTol;
   if(a.price>=a.support-buf){entryReason='AWAIT_BREAKOUT_QUALITY_V2';mode='Adaptive Entry V2 — closed-candle breakdown, then choose momentum continuation or retest';triggerMode='ADAPTIVE_BREAKOUT_V2';entry=a.support-.03*atrv;}
   else if(pre.decision==='CLOSE_CANDIDATE'){entryReason='POST_BREAKOUT_HIGH_QUALITY_V2';mode='Adaptive V2 momentum continuation after confirmed close';triggerMode='BREAKDOWN_CLOSE';entry=a.price-.04*atrv;}
   else{entryReason='POST_BREAKOUT_RETEST_BIAS_V2';mode='Adaptive V2 retest of broken support before continuation';triggerMode='RETEST_AFTER_BREAKDOWN';entry=a.support-.03*atrv;}
   const structural=Math.max(a.resistance+.10*atrv,entry+.90*atrv);let risk=structural-entry;risk=Math.max(.90*atrv,Math.min(risk,1.80*atrv));stop=entry+risk;tp1=entry-1.20*risk;tp2=entry-2.00*risk;
 }
 return{entry,stop,tp1,tp2,mode,entryReason,triggerMode,breakoutLevel,retestLow,retestHigh,
   resistanceStrength:a.resistanceStrength||0,supportStrength:a.supportStrength||0,
   resistanceTouches:a.resistanceTouches||0,supportTouches:a.supportTouches||0,policyName:policy.name,policyConfig:{...policy},preBreakoutQuality:pre.score,preDecision:pre.decision,levelStrength,atrRef:atrv,entryModelVersion:'AdaptiveEntryV2'};
}

function executionExpiryBars(tf){return tf==='M15'?16:tf==='H1'?8:5;}
function executionHoldBars(tf){return tf==='M15'?32:tf==='H1'?24:12;}
function executionVolumeRatioAt(cs,idx){
 if(idx<1)return 1;
 const from=Math.max(0,idx-20),vals=cs.slice(from,idx).map(x=>x.volume||0),m=vals.length?mean(vals):0;
 return m>0?(cs[idx].volume||0)/m:1;
}
function adaptiveBreakoutDecision(cs,idx,side,plan,policy=LIVE_POLICY){
 const b=cs[idx];
 if(!b)return{score:0,decision:'RETEST',reason:'MISSING_BREAKOUT_BAR',bodyAtr:0,closeLocation:0,distanceAtr:0,volumeRatio:0,threshold:policy.breakoutCloseScore,strongLevel:false};
 const atrv=Math.max(plan.atrRef||plan.atrAtCreation||0,Math.abs(plan.breakoutLevel||b.close)*.002,1e-12),range=Math.max(b.high-b.low,1e-12);
 const bodyAtr=Math.abs(b.close-b.open)/atrv;
 const closeLocation=side===1?(b.close-b.low)/range:(b.high-b.close)/range;
 const distanceAtr=side===1?(b.close-plan.breakoutLevel)/atrv:(plan.breakoutLevel-b.close)/atrv;
 const vr=executionVolumeRatioAt(cs,idx);
 const bodyScore=clamp(bodyAtr/.90*100),locScore=clamp(closeLocation*100),distanceScore=clamp(distanceAtr/.50*100),volumeScore=clamp(vr/1.50*100),pre=Number.isFinite(plan.preBreakoutQuality)?plan.preBreakoutQuality:60;
 let score=pre*.55+bodyScore*.12+locScore*.10+distanceScore*.10+volumeScore*.13;
 const strong=(plan.levelStrength||0)>=policy.strongLevel;
 if(strong&&distanceAtr<.15)score-=8;
 score=clamp(score);
 const threshold=policy.breakoutCloseScore+(strong?policy.strongPremium:0);
 const evidenceOk=bodyAtr>=policy.minBodyAtr&&closeLocation>=policy.minCloseLocation&&(vr>=policy.minVolumeRatio||pre>=85);
 const decision=score>=threshold&&evidenceOk?'CLOSE':'RETEST';
 let reason='BREAKOUT_V2_RETEST';
 if(decision==='CLOSE')reason='BREAKOUT_V2_MOMENTUM_CONTINUATION';
 else if(strong)reason='BREAKOUT_V2_STRONG_LEVEL_RETEST';
 else if(vr<policy.minVolumeRatio)reason='BREAKOUT_V2_LOW_VOLUME_RETEST';
 else if(bodyAtr<policy.minBodyAtr||closeLocation<policy.minCloseLocation)reason='BREAKOUT_V2_WEAK_CANDLE_RETEST';
 return{score,decision,reason,bodyAtr,closeLocation,distanceAtr,volumeRatio:vr,threshold,strongLevel:strong};
}
function executionEffectiveLevels(plan,actualEntry,side){
 const stop=+plan.stop;
 if(!Number.isFinite(actualEntry)||!Number.isFinite(stop))return null;
 const risk=side===1?actualEntry-stop:stop-actualEntry;
 if(!(risk>0))return null;
 return{
   actualEntry,effectiveStop:stop,effectiveRisk:risk,
   effectiveTP1:side===1?actualEntry+1.20*risk:actualEntry-1.20*risk,
   effectiveTP2:side===1?actualEntry+2.00*risk:actualEntry-2.00*risk
 };
}
function executionCostR(entry,risk,costBps){
 const riskPct=risk/Math.max(Math.abs(entry),1e-12),costPct=costBps/10000;
 return riskPct>0?costPct/riskPct:0;
}
function resolveExecutionTrade(cs,exec,side,costBps,holdBars){
 const long=side===1,entry=exec.actualEntry,stop=exec.effectiveStop,tp1=exec.effectiveTP1,risk=exec.effectiveRisk;
 const costR=executionCostR(entry,risk,costBps),end=Math.min(cs.length-1,exec.execIndex+holdBars);
 for(let j=exec.execIndex;j<=end;j++){
   const b=cs[j],stopHit=long?b.low<=stop:b.high>=stop,tp1Hit=long?b.high>=tp1:b.low<=tp1;
   if(stopHit&&tp1Hit)return{triggered:true,resolved:false,ambiguous:true,outcome:'AMBIGUOUS',r:null,exitIndex:j};
   if(stopHit)return{triggered:true,resolved:true,ambiguous:false,outcome:'STOP',r:-(1+costR),exitIndex:j};
   if(tp1Hit)return{triggered:true,resolved:true,ambiguous:false,outcome:'TP1',r:1.20-costR,exitIndex:j};
 }
 const last=cs[end],raw=(long?(last.close-entry):(entry-last.close))/Math.max(risk,1e-12);
 return{triggered:true,resolved:true,ambiguous:false,outcome:'TIME_EXIT',r:raw-costR,exitIndex:end};
}
function executionRegimeBucket(a){
 const side=a.side||0,dm=dirValueEntry(a.momentum,side||1),level=side===1?(a.resistanceStrength||0):(a.supportStrength||0),vr=a.volumeRatio||1;
 if(a.regime==='Ranging')return'Ranging';
 if(a.regime==='Trending'&&dm>=70&&vr>=1.05)return'Trending + high momentum';
 if(a.regime==='Trending'&&vr<.85)return'Trending + low participation';
 if(level>=80)return'Strong S/R level';
 if(a.regime==='Trending')return'Trending — other';
 return'Mixed / transition';
}
function simulateAdaptiveExecution(cs,sample,tf,costBps){
 const i=sample.i,side=sample.dir,a={...sample.a,side},long=side===1,plan=paperLevels(a),expiry=executionExpiryBars(tf),hold=executionHoldBars(tf),maxEntry=Math.min(cs.length-2,i+expiry);
 let breakoutIndex=-1,retestIndex=-1,confirmIndex=-1,adaptiveDecision=null,adaptiveMeta=null,noTriggerReason='';
 for(let j=i+1;j<=maxEntry;j++){
   const b=cs[j],ok=long?b.close>plan.breakoutLevel:b.close<plan.breakoutLevel;
   if(ok){breakoutIndex=j;break;}
 }
 if(breakoutIndex<0)return{signalIndex:i,fold:sample.fold,side,regime:executionRegimeBucket(a),triggered:false,resolved:false,noTriggerReason:'NO_BREAKOUT'};
 let needsRetest=String(plan.triggerMode||'').includes('RETEST');
 if(plan.triggerMode==='ADAPTIVE_BREAKOUT_V2'){
   adaptiveMeta=adaptiveBreakoutDecision(cs,breakoutIndex,side,plan,plan.policyConfig||LIVE_POLICY);
   adaptiveDecision=adaptiveMeta.decision;
   needsRetest=adaptiveDecision==='RETEST';
 }
 if(!needsRetest)confirmIndex=breakoutIndex;
 else{
   for(let j=breakoutIndex+1;j<=maxEntry;j++){
     const b=cs[j],touch=b.low<=plan.retestHigh&&b.high>=plan.retestLow,holdLevel=long?b.close>plan.breakoutLevel:b.close<plan.breakoutLevel,failed=long?b.close<plan.stop:b.close>plan.stop;
     if(failed){noTriggerReason='FAILED_RETEST';break;}
     if(touch&&holdLevel){retestIndex=j;confirmIndex=j;break;}
   }
   if(confirmIndex<0)return{signalIndex:i,fold:sample.fold,side,regime:executionRegimeBucket(a),triggered:false,resolved:false,noTriggerReason:noTriggerReason||'NO_RETEST',adaptiveDecision,adaptiveMeta};
 }
 const execIndex=confirmIndex+1;
 if(execIndex>=cs.length)return{signalIndex:i,fold:sample.fold,side,regime:executionRegimeBucket(a),triggered:false,resolved:false,noTriggerReason:'INVALID_NEXT_OPEN'};
 const eff=executionEffectiveLevels(plan,cs[execIndex].open,side);
 if(!eff)return{signalIndex:i,fold:sample.fold,side,regime:executionRegimeBucket(a),triggered:false,resolved:false,noTriggerReason:'INVALID_EFFECTIVE_RISK'};
 const result=resolveExecutionTrade(cs,{execIndex,...eff},side,costBps,hold);
 return{signalIndex:i,fold:sample.fold,side,regime:executionRegimeBucket(a),adaptiveDecision,adaptiveMeta,breakoutIndex,retestIndex,confirmIndex,execIndex,...result};
}
function aggregateExecution(rows){
 const triggered=rows.filter(x=>x.triggered),resolved=triggered.filter(x=>x.resolved&&Number.isFinite(x.r)),wins=resolved.filter(x=>x.r>0),losses=resolved.filter(x=>x.r<0);
 const grossWin=wins.reduce((s,x)=>s+x.r,0),grossLoss=Math.abs(losses.reduce((s,x)=>s+x.r,0)),pf=grossLoss?grossWin/grossLoss:(grossWin?Infinity:0);
 let eq=0,peak=0,maxDD=0;
 for(const x of resolved){eq+=x.r;peak=Math.max(peak,eq);maxDD=Math.max(maxDD,peak-eq);}
 return{
   signals:rows.length,triggered:triggered.length,triggerRate:rows.length?triggered.length/rows.length:0,resolved:resolved.length,
   wins:wins.length,losses:losses.length,accuracy:resolved.length?wins.length/resolved.length:0,pf,
   avgR:resolved.length?resolved.reduce((s,x)=>s+x.r,0)/resolved.length:0,
   wilson:wilsonLower95(wins.length,resolved.length),maxDD,
   ambiguous:triggered.filter(x=>x.ambiguous).length
 };
}
function executionFoldStats(rows,folds=4){
 const out=[];
 for(let f=0;f<folds;f++){const st=aggregateExecution(rows.filter(x=>x.fold===f));out.push({fold:f+1,...st});}
 return out;
}
function executionRegimeStats(rows){
 const names=['Trending + high momentum','Trending + low participation','Strong S/R level','Ranging','Trending — other','Mixed / transition'];
 return names.map(name=>({name,...aggregateExecution(rows.filter(x=>x.regime===name))})).filter(x=>x.signals>0);
}
function executionValidation(sets,tf,costBps=10,pwf=null,side=null,currentA=null){
 const cs=sets[tf]||[];
 if(!pwf)pwf=purgedWalkForward(sets,tf,costBps);
 if(!currentA){
   try{currentA=finalizeCurrent(sets)[tf]||null;}catch{currentA=null;}
 }
 side=side||currentA?.side||0;
 const empty=aggregateExecution([]);
 if(!side)return{available:false,pass:false,hardPass:false,robustness:'N/A',reason:'NEUTRAL_DIRECTION',stats:empty,folds:[],regimes:[],currentRegime:null,regimeStats:empty,regimeState:'N/A',hardBlockReasons:['NEUTRAL_DIRECTION']};
 const fullWindow=executionExpiryBars(tf)+executionHoldBars(tf)+2;
 const samples=(pwf.signalSamples||[]).filter(x=>x.dir===side&&(!Number.isFinite(x.foldRawEnd)||x.i+fullWindow<=x.foldRawEnd));
 if(!samples.length)return{available:false,pass:false,hardPass:false,robustness:'WEAK',reason:'NO_PURGED_EXECUTION_SAMPLES',stats:empty,folds:[],regimes:[],currentRegime:currentA?executionRegimeBucket({...currentA,side}):null,regimeStats:empty,regimeState:'INSUFFICIENT_SAMPLE',hardBlockReasons:['NO_EXECUTION_SAMPLES']};
 const rows=samples.map(x=>simulateAdaptiveExecution(cs,x,tf,costBps));
 const stats=aggregateExecution(rows),folds=executionFoldStats(rows,pwf.spec?.folds||4),regimes=executionRegimeStats(rows);
 const needN=validationSpec(tf).minN;
 // This gate validates the actual Adaptive Entry V2 lifecycle, not only directional accuracy.
 // A positive expectancy + PF above 1.10 is required after the same research cost.
 const globalPass=stats.resolved>=needN&&stats.pf>=1.10&&stats.avgR>=.02&&stats.wilson>=.42;
 const eligibleFolds=folds.filter(x=>x.resolved>=10),profitableFolds=eligibleFolds.filter(x=>x.pf>=1.0&&x.avgR>=0).length;
 const medPF=eligibleFolds.length?median(eligibleFolds.map(x=>x.pf)):0;
 const foldPass=eligibleFolds.length>=3&&profitableFolds>=3&&medPF>=1.05;
 const currentRegime=currentA?executionRegimeBucket({...currentA,side}):null;
 const regimeStats=currentRegime?aggregateExecution(rows.filter(x=>x.regime===currentRegime)):empty;
 const regimeMinN=tf==='M15'?30:tf==='H1'?25:20;
 let regimeState='INSUFFICIENT_SAMPLE',regimePass=false;
 if(regimeStats.resolved>=regimeMinN){
   if(regimeStats.pf>=1.10&&regimeStats.avgR>=.02&&regimeStats.wilson>=.40){regimeState='ALLOW';regimePass=true;}
   else if(regimeStats.pf<.95||regimeStats.avgR<=0)regimeState='SKIP_SETUP';
   else regimeState='WAIT_DEVELOPING';
 }
 const hardBlockReasons=[];
 if(stats.resolved<needN)hardBlockReasons.push('EXECUTION_N');
 if(stats.pf<1.10)hardBlockReasons.push('EXECUTION_PF');
 if(stats.avgR<.02)hardBlockReasons.push('EXECUTION_EXPECTANCY');
 if(stats.wilson<.42)hardBlockReasons.push('EXECUTION_WILSON');
 if(!foldPass)hardBlockReasons.push('FOLD_INSTABILITY');
 if(regimeState==='SKIP_SETUP')hardBlockReasons.push('REGIME_SKIP');
 if(regimeState!=='ALLOW')hardBlockReasons.push('REGIME_NOT_VALIDATED');
 // V5.6.7.6: the current regime is a real execution gate. Under-sampled or developing regimes
 // can be monitored as research watchlists, but they do not qualify as execution-ready scenarios.
 const hardPass=globalPass&&foldPass&&regimeState==='ALLOW';
 const pass=hardPass;
 const regimeCaution=regimeState!=='ALLOW';
 let robustness='WEAK';
 if(globalPass&&foldPass&&regimeState!=='SKIP_SETUP')robustness='DEVELOPING';
 if(hardPass)robustness='CONFIRMED';
 if(hardPass&&stats.resolved>=200&&stats.pf>=1.20&&stats.avgR>=.05&&stats.wilson>=.50&&profitableFolds>=3&&medPF>=1.15&&regimeStats.resolved>=50&&regimeStats.pf>=1.15&&regimeStats.avgR>=.03)robustness='STRONG_RESEARCH_EDGE';
 return{
   available:true,pass,hardPass,robustness,reason:hardPass?'EXECUTION_GATE_PASS':'EXECUTION_GATE_FAIL',hardBlockReasons,
   stats,folds,regimes,currentRegime,regimeStats,regimeState,regimePass,regimeCaution,regimeMinN,
   globalPass,foldPass,needN,eligibleFolds:eligibleFolds.length,profitableFolds,medianFoldPF:medPF,
   costBps,side,rows
 };
}

root.UnifiedDecisionEngine={
 version:'5.6.7.6',
 validationSpec,technicalCore,contextScore,finalizeOne,finalizeCurrent,higherTfVeto,
 historicalSnapshot,fullStartIndex,purgedWalkForward,validationMode,paperLevels,entryQualityV2,adaptiveBreakoutDecision,
 executionValidation,executionRegimeBucket,aggregateExecution,LIVE_POLICY,
 wilsonLower95,atr,clamp,normBase
};
})(typeof window!=='undefined'?window:globalThis);
