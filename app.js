const $ = id => document.getElementById(id);
let current = null;
let currentTf = 'M15';
let deferredPrompt = null;

const WEIGHTS = {
  structure:25, emaOrder:15, emaSlope:10, rsi:10,
  adx:10, volume:10, levels:10, breakoutRetest:10
};
const FACTOR = {
  strong_bullish:1, bullish:.75, bullish_transition:.70,
  neutral:.50, bearish_transition:.30, bearish:.25, strong_bearish:0
};
const LABELS = {
  structure:'Market Structure',
  emaOrder:'EMA Order',
  emaSlope:'EMA Slope',
  rsi:'RSI 14',
  adx:'ADX + DI',
  volume:'Volume',
  levels:'Support / Resistance',
  breakoutRetest:'Breakout + Retest'
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  $('installBtn').classList.remove('hidden');
});

$('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('installBtn').classList.add('hidden');
});

function esc(s=''){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmt(v,n=4){ return Number.isFinite(v) ? Number(v).toFixed(n) : 'N/A'; }
function clsFromState(s=''){
  if (s.includes('bullish')) return 'bullish';
  if (s.includes('bearish')) return 'bearish';
  return 'neutral';
}
function classify(score){
  if(score>=80)return{label:'صاعد قوي جدًا',direction:'bullish'};
  if(score>=65)return{label:'صاعد',direction:'bullish'};
  if(score>=55)return{label:'ميل صاعد ضعيف',direction:'bullish'};
  if(score>=45)return{label:'محايد / نطاق عرضي',direction:'neutral'};
  if(score>=35)return{label:'ميل هابط ضعيف',direction:'bearish'};
  if(score>=20)return{label:'هابط',direction:'bearish'};
  return{label:'هابط قوي جدًا',direction:'bearish'};
}
function lastNonNull(a){
  for(let i=a.length-1;i>=0;i--) if(a[i]!==null && Number.isFinite(a[i])) return a[i];
  return null;
}
function ema(values,period){
  const out=Array(values.length).fill(null);
  if(values.length<period)return out;
  const k=2/(period+1);
  let seed=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  out[period-1]=seed;
  for(let i=period;i<values.length;i++){
    seed=values[i]*k+seed*(1-k); out[i]=seed;
  }
  return out;
}
function sma(values,period){
  const out=Array(values.length).fill(null); let sum=0;
  for(let i=0;i<values.length;i++){
    sum+=values[i];
    if(i>=period)sum-=values[i-period];
    if(i>=period-1)out[i]=sum/period;
  }
  return out;
}
function rsi(closes,period=14){
  const out=Array(closes.length).fill(null);
  if(closes.length<=period)return out;
  const gains=[],losses=[];
  for(let i=1;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    gains.push(Math.max(d,0)); losses.push(Math.max(-d,0));
  }
  let ag=gains.slice(0,period).reduce((a,b)=>a+b,0)/period;
  let al=losses.slice(0,period).reduce((a,b)=>a+b,0)/period;
  const calc=()=>al===0?100:100-(100/(1+ag/al));
  out[period]=calc();
  for(let i=period+1;i<closes.length;i++){
    ag=((ag*(period-1))+gains[i-1])/period;
    al=((al*(period-1))+losses[i-1])/period;
    out[i]=calc();
  }
  return out;
}
function atr(candles,period=14){
  const tr=candles.map((c,i)=>{
    if(i===0)return c.high-c.low;
    const pc=candles[i-1].close;
    return Math.max(c.high-c.low,Math.abs(c.high-pc),Math.abs(c.low-pc));
  });
  const out=Array(candles.length).fill(null);
  if(candles.length<period)return out;
  let v=tr.slice(0,period).reduce((a,b)=>a+b,0)/period; out[period-1]=v;
  for(let i=period;i<candles.length;i++){v=((v*(period-1))+tr[i])/period; out[i]=v;}
  return out;
}
function wilderSmooth(values,period){
  const out=Array(values.length).fill(null);
  if(values.length<period)return out;
  let sum=values.slice(0,period).reduce((a,b)=>a+b,0);
  out[period-1]=sum;
  for(let i=period;i<values.length;i++){sum=sum-sum/period+(values[i]||0); out[i]=sum;}
  return out;
}
function adx(candles,period=14){
  const n=candles.length,plusDM=Array(n).fill(0),minusDM=Array(n).fill(0),tr=Array(n).fill(0);
  for(let i=1;i<n;i++){
    const up=candles[i].high-candles[i-1].high;
    const down=candles[i-1].low-candles[i].low;
    plusDM[i]=up>down&&up>0?up:0;
    minusDM[i]=down>up&&down>0?down:0;
    const pc=candles[i-1].close;
    tr[i]=Math.max(candles[i].high-candles[i].low,Math.abs(candles[i].high-pc),Math.abs(candles[i].low-pc));
  }
  const smTR=wilderSmooth(tr.slice(1),period),smP=wilderSmooth(plusDM.slice(1),period),smM=wilderSmooth(minusDM.slice(1),period);
  const plusDI=Array(n).fill(null),minusDI=Array(n).fill(null),dx=Array(n).fill(null),adxOut=Array(n).fill(null);
  for(let j=period-1;j<smTR.length;j++){
    const i=j+1;if(!smTR[j])continue;
    plusDI[i]=100*(smP[j]/smTR[j]); minusDI[i]=100*(smM[j]/smTR[j]);
    const den=plusDI[i]+minusDI[i]; dx[i]=den?100*Math.abs(plusDI[i]-minusDI[i])/den:0;
  }
  const vals=[],idx=[];
  for(let i=0;i<n;i++)if(dx[i]!==null){vals.push(dx[i]);idx.push(i);}
  if(vals.length>=period){
    let av=vals.slice(0,period).reduce((a,b)=>a+b,0)/period; adxOut[idx[period-1]]=av;
    for(let k=period;k<vals.length;k++){av=((av*(period-1))+vals[k])/period; adxOut[idx[k]]=av;}
  }
  return{adx:adxOut,plusDI,minusDI};
}
function pivots(candles,left=3,right=3){
  const highs=[],lows=[];
  for(let i=left;i<candles.length-right;i++){
    let ph=true,pl=true;
    for(let j=i-left;j<=i+right;j++){
      if(j===i)continue;
      if(candles[j].high>=candles[i].high)ph=false;
      if(candles[j].low<=candles[i].low)pl=false;
    }
    if(ph)highs.push({i,price:candles[i].high,time:candles[i].time});
    if(pl)lows.push({i,price:candles[i].low,time:candles[i].time});
  }
  return{highs,lows};
}
function structure(candles){
  const {highs,lows}=pivots(candles),h=highs.slice(-3),l=lows.slice(-3);
  let state='neutral',evidence='لا توجد قمم/قيعان مؤكدة كافية.';
  if(h.length>=2&&l.length>=2){
    const hh=h.at(-1).price>h.at(-2).price,lh=h.at(-1).price<h.at(-2).price;
    const hl=l.at(-1).price>l.at(-2).price,ll=l.at(-1).price<l.at(-2).price;
    if(hh&&hl){state='strong_bullish';evidence='آخر قمة أعلى وآخر قاع أعلى (HH + HL).';}
    else if(lh&&ll){state='strong_bearish';evidence='آخر قمة أدنى وآخر قاع أدنى (LH + LL).';}
    else if(hh&&ll){state='bullish_transition';evidence='قمة أعلى مع قاع أدنى؛ تحول غير مكتمل يميل للصعود.';}
    else if(lh&&hl){state='bearish_transition';evidence='قمة أدنى مع قاع أعلى؛ تحول غير مكتمل يميل للهبوط.';}
  }
  return{state,evidence,highs,lows};
}
function annotations(candles){
  const {highs,lows}=pivots(candles);
  const labels=[]; let ph=null,pl=null;
  for(const p of highs){
    const label=ph===null?'H':(p.price>ph?'HH':'LH');
    labels.push({...p,label,isHigh:true}); ph=p.price;
  }
  for(const p of lows){
    const label=pl===null?'L':(p.price>pl?'HL':'LL');
    labels.push({...p,label,isHigh:false}); pl=p.price;
  }
  labels.sort((a,b)=>a.i-b.i);
  const bos=[];let hp=0,lp=0,lastH=null,lastL=null;
  for(let i=0;i<candles.length;i++){
    while(hp<highs.length&&highs[hp].i<i){lastH=highs[hp++];}
    while(lp<lows.length&&lows[lp].i<i){lastL=lows[lp++];}
    if(i===0)continue;
    const prev=candles[i-1].close;
    if(lastH&&prev<=lastH.price&&candles[i].close>lastH.price){
      bos.push({i,price:candles[i].close,time:candles[i].time,label:'BOS↑',bullish:true});lastH=null;
    }
    if(lastL&&prev>=lastL.price&&candles[i].close<lastL.price){
      bos.push({i,price:candles[i].close,time:candles[i].time,label:'BOS↓',bullish:false});lastL=null;
    }
  }
  return{labels,bos};
}
function slopeState(series,lookback=5){
  let i=series.length-1;while(i>=0&&series[i]===null)i--;
  if(i<0)return'neutral';
  const now=series[i];let prev=null;
  for(let j=Math.max(0,i-lookback);j>=0;j--){if(series[j]!==null){prev=series[j];break;}}
  if(prev===null||prev===0)return'neutral';
  const pct=(now-prev)/Math.abs(prev);
  if(pct>.003)return'bullish'; if(pct<-.003)return'bearish'; return'neutral';
}
function rsiFactor(v){
  if(v===null)return.5;if(v>=60)return 1;if(v>=55)return.75;if(v>=50)return.60;if(v>=45)return.40;if(v>=40)return.25;return 0;
}
function analyzeCandles(candles,timeframe){
  if(candles.length<220)throw new Error('يلزم 220 شمعة على الأقل.');
  const closes=candles.map(c=>c.close),volumes=candles.map(c=>c.volume);
  const e20=ema(closes,20),e50=ema(closes,50),e200=ema(closes,200),rs=rsi(closes),at=atr(candles),dx=adx(candles),vma=sma(volumes,20);
  const last=candles.at(-1),E20=lastNonNull(e20),E50=lastNonNull(e50),E200=lastNonNull(e200),R=lastNonNull(rs),A=lastNonNull(dx.adx),P=lastNonNull(dx.plusDI),M=lastNonNull(dx.minusDI),ATR=lastNonNull(at),VMA=lastNonNull(vma);
  const st=structure(candles),ann=annotations(candles);

  let emaOrder='neutral';
  if(last.close>E20&&E20>E50&&E50>E200)emaOrder='strong_bullish';
  else if(last.close>E50&&E50>E200)emaOrder='bullish';
  else if(last.close<E20&&E20<E50&&E50<E200)emaOrder='strong_bearish';
  else if(last.close<E50&&E50<E200)emaOrder='bearish';

  const slopes=[slopeState(e20),slopeState(e50),slopeState(e200)];
  let emaSlope='neutral';
  if(slopes.every(x=>x==='bullish'))emaSlope='strong_bullish';
  else if(slopes.filter(x=>x==='bullish').length>=2)emaSlope='bullish';
  else if(slopes.every(x=>x==='bearish'))emaSlope='strong_bearish';
  else if(slopes.filter(x=>x==='bearish').length>=2)emaSlope='bearish';

  let adxState='neutral';
  if(A!==null&&P!==null&&M!==null){
    if(A>=25&&P>M)adxState='strong_bullish';
    else if(A>=20&&P>M)adxState='bullish';
    else if(A>=25&&M>P)adxState='strong_bearish';
    else if(A>=20&&M>P)adxState='bearish';
  }
  const volRatio=VMA?last.volume/VMA:1;
  const pc=last.close-last.open;
  let volume='neutral';
  if(volRatio>=1.5&&pc>0)volume='strong_bullish';
  else if(volRatio>=1.2&&pc>0)volume='bullish';
  else if(volRatio>=1.5&&pc<0)volume='strong_bearish';
  else if(volRatio>=1.2&&pc<0)volume='bearish';

  const resistance=st.highs.length?st.highs.at(-1).price:Math.max(...candles.slice(-30).map(c=>c.high));
  const support=st.lows.length?st.lows.at(-1).price:Math.min(...candles.slice(-30).map(c=>c.low));
  const tol=(ATR||last.close*.005)*.35;
  let levels='neutral',levelsEv=`الدعم ${support.toFixed(6)} والمقاومة ${resistance.toFixed(6)}.`;
  if(last.close>resistance+tol){levels='bullish';levelsEv=`الإغلاق فوق المقاومة ${resistance.toFixed(6)}.`;}
  else if(last.close<support-tol){levels='bearish';levelsEv=`الإغلاق تحت الدعم ${support.toFixed(6)}.`;}
  else if(Math.abs(last.close-support)<=tol){levels='bullish';levelsEv=`السعر قريب من دعم ${support.toFixed(6)} وما زال فوقه.`;}
  else if(Math.abs(last.close-resistance)<=tol){levels='bearish';levelsEv=`السعر قريب من مقاومة ${resistance.toFixed(6)} وما زال تحتها.`;}

  let br='neutral',brEv='لا يوجد كسر وإعادة اختبار مؤكدة في الشموع الأخيرة.';
  const recent=candles.slice(-10);let bull=-1,bear=-1;
  for(let i=0;i<recent.length;i++){if(recent[i].close>resistance+tol)bull=i;if(recent[i].close<support-tol)bear=i;}
  if(bull>=0&&bull<recent.length-1){
    const after=recent.slice(bull+1),retest=after.some(c=>c.low<=resistance+tol&&c.close>=resistance-tol);
    if(retest&&recent.at(-1).close>resistance){br='strong_bullish';brEv='كسر مقاومة ثم إعادة اختبار ناجحة فوقها.';}
    else{br='bullish';brEv='كسر صاعد ظاهر بدون إعادة اختبار مكتملة.';}
  }else if(bear>=0&&bear<recent.length-1){
    const after=recent.slice(bear+1),retest=after.some(c=>c.high>=support-tol&&c.close<=support+tol);
    if(retest&&recent.at(-1).close<support){br='strong_bearish';brEv='كسر دعم ثم إعادة اختبار فاشلة من أسفله.';}
    else{br='bearish';brEv='كسر هابط ظاهر بدون إعادة اختبار مكتملة.';}
  }

  const states={structure:st.state,emaOrder,emaSlope,rsi:'numeric',adx:adxState,volume,levels,breakoutRetest:br};
  const points={
    structure:(FACTOR[states.structure]??.5)*WEIGHTS.structure,
    emaOrder:(FACTOR[states.emaOrder]??.5)*WEIGHTS.emaOrder,
    emaSlope:(FACTOR[states.emaSlope]??.5)*WEIGHTS.emaSlope,
    rsi:rsiFactor(R)*WEIGHTS.rsi,
    adx:(FACTOR[states.adx]??.5)*WEIGHTS.adx,
    volume:(FACTOR[states.volume]??.5)*WEIGHTS.volume,
    levels:(FACTOR[states.levels]??.5)*WEIGHTS.levels,
    breakoutRetest:(FACTOR[states.breakoutRetest]??.5)*WEIGHTS.breakoutRetest
  };
  const score=Object.values(points).reduce((a,b)=>a+b,0),cl=classify(score);

  const evidence={
    structure:st.evidence,
    emaOrder:`Close ${last.close.toFixed(6)} | EMA20 ${E20.toFixed(6)} | EMA50 ${E50.toFixed(6)} | EMA200 ${E200.toFixed(6)}.`,
    emaSlope:`ميل EMA20/50/200: ${slopes.join(' / ')}.`,
    rsi:`RSI14 = ${R?.toFixed(2)??'N/A'}.`,
    adx:`ADX14 = ${A?.toFixed(2)??'N/A'} | +DI ${P?.toFixed(2)??'N/A'} | -DI ${M?.toFixed(2)??'N/A'}.`,
    volume:`الحجم الحالي ÷ متوسط 20 = ${volRatio.toFixed(2)}x.`,
    levels:levelsEv,
    breakoutRetest:brEv
  };

  const start=Math.max(0,candles.length-140);
  const chartCandles=candles.slice(start).map((c,j)=>({...c,index:start+j,ema20:e20[start+j],ema50:e50[start+j],ema200:e200[start+j]}));
  return{
    timeframe,price:last.close,score:+score.toFixed(1),bearishScore:+(100-score).toFixed(1),...cl,points,states,evidence,
    indicators:{ema20:E20,ema50:E50,ema200:E200,rsi14:R,adx14:A,plusDI:P,minusDI:M,atr14:ATR,volumeRatio:volRatio},
    chart:{candles:chartCandles,pivots:ann.labels.filter(x=>x.i>=start).slice(-26),bos:ann.bos.filter(x=>x.i>=start).slice(-14),support,resistance}
  };
}
function master(results){
  const w={D1:.35,H1:.40,M15:.25};let total=0,sum=0;
  for(const r of results){if(w[r.timeframe]){total+=r.score*w[r.timeframe];sum+=w[r.timeframe];}}
  const score=sum?total/sum:50;return{score:+score.toFixed(1),bearishScore:+(100-score).toFixed(1),...classify(score)};
}
async function fetchKlines(symbol,interval,market){
  const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!clean)throw new Error('رمز العملة غير صالح.');
  const base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
  const url=`${base}?symbol=${encodeURIComponent(clean)}&interval=${interval}&limit=500`;
  const res=await fetch(url);
  const data=await res.json();
  if(!res.ok||!Array.isArray(data))throw new Error(data?.msg||'تعذر جلب بيانات السوق.');
  return data.map(r=>({time:+r[0],open:+r[1],high:+r[2],low:+r[3],close:+r[4],volume:+r[5]}));
}

$('analyzeBtn').addEventListener('click', async ()=>{
  const btn=$('analyzeBtn'); btn.disabled=true; $('status').textContent='جاري جلب D1 وH1 وM15 وحساب المؤشرات...';
  try{
    const symbol=$('symbol').value.trim(), market=$('market').value;
    const defs=[['D1','1d'],['H1','1h'],['M15','15m']];
    const candles=await Promise.all(defs.map(d=>fetchKlines(symbol,d[1],market)));
    const results=defs.map((d,i)=>analyzeCandles(candles[i],d[0]));
    current={symbol:symbol.toUpperCase(),market,results,master:master(results)};
    localStorage.setItem('lastSymbol',symbol.toUpperCase());
    localStorage.setItem('lastMarket',market);
    renderAll();
    $('status').textContent='تم التحليل بنجاح.';
  }catch(e){
    $('status').textContent='خطأ: '+e.message;
  }finally{btn.disabled=false;}
});

function renderAll(){
  $('masterCard').classList.remove('hidden');
  $('workspace').classList.remove('hidden');
  $('verifyCard').classList.remove('hidden');
  const m=current.master;
  $('masterCard').innerHTML=`<div class="masterrow"><div><h2>Master Trend Score</h2><div class="score ${m.direction}">${m.score}/100</div><strong class="${m.direction}">${esc(m.label)}</strong></div><div><b>صعود:</b> ${m.score}%<br><b>هبوط:</b> ${m.bearishScore}%<br><span class="muted">${esc(current.symbol)} • ${esc(current.market)}</span></div></div>`;
  $('tabs').innerHTML=current.results.map(r=>`<button class="tab ${r.timeframe===currentTf?'active':''}" data-tf="${r.timeframe}">${r.timeframe}</button>`).join('');
  $('tabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>{currentTf=b.dataset.tf;$('tabs').querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tf===currentTf));renderTf();});
  renderTf();
}
function renderTf(){
  const r=current.results.find(x=>x.timeframe===currentTf)||current.results[0];
  currentTf=r.timeframe;
  $('chartTitle').textContent=`${current.symbol} — ${r.timeframe}`;
  $('chartMeta').textContent=`السعر ${fmt(r.price,6)} • ${r.label} • ${r.score}/100`;
  renderChart(r);
  renderScore(r);
  renderIndicators(r);
}
function renderScore(r){
  $('scorePanel').innerHTML=`<h2>Trend Score — ${r.timeframe}</h2><div class="score ${r.direction}">${r.score}/100</div><strong class="${r.direction}">${esc(r.label)}</strong><div style="height:14px"></div>`+
    Object.keys(LABELS).map(k=>{
      const pct=(r.points[k]/WEIGHTS[k])*100, c=clsFromState(r.states[k]||'');
      return `<div class="factor"><div class="factorline"><div><b>${LABELS[k]}</b><small>${esc(r.evidence[k])}</small></div><b>${Number(r.points[k]).toFixed(1)}/${WEIGHTS[k]}</b></div><div class="bar ${c}"><div style="width:${pct}%"></div></div></div>`;
    }).join('');
}
function renderIndicators(r){
  const x=r.indicators;
  const items=[
    ['EMA20',fmt(x.ema20,6)],['EMA50',fmt(x.ema50,6)],['EMA200',fmt(x.ema200,6)],
    ['RSI14',fmt(x.rsi14,2)],['ADX14',fmt(x.adx14,2)],['+DI',fmt(x.plusDI,2)],
    ['-DI',fmt(x.minusDI,2)],['ATR14',fmt(x.atr14,6)],['Vol/MA20',fmt(x.volumeRatio,2)+'x'],
    ['Support',fmt(r.chart.support,6)],['Resistance',fmt(r.chart.resistance,6)],['Timeframe',r.timeframe]
  ];
  $('indicatorPanel').innerHTML=`<h2>المؤشرات</h2><div class="indgrid">${items.map(i=>`<div class="stat"><small>${i[0]}</small><b>${i[1]}</b></div>`).join('')}</div>`;
}

function renderChart(r){
  const canvas=$('chartCanvas'),wrap=canvas.parentElement,tip=$('tooltip');
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const rect=wrap.getBoundingClientRect();
  canvas.width=Math.floor(rect.width*dpr); canvas.height=Math.floor(rect.height*dpr);
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const W=rect.width,H=rect.height,data=r.chart.candles;
  const pad={l:8,r:62,t:16,b:24},cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
  const vals=[];
  data.forEach(c=>{vals.push(c.high,c.low);['ema20','ema50','ema200'].forEach(k=>{if(Number.isFinite(c[k]))vals.push(c[k]);});});
  vals.push(r.chart.support,r.chart.resistance);
  let ymin=Math.min(...vals),ymax=Math.max(...vals),yr=ymax-ymin||1;ymin-=yr*.05;ymax+=yr*.05;
  const x=i=>pad.l+(i+.5)*(cw/data.length), y=v=>pad.t+(ymax-v)/(ymax-ymin)*ch;
  ctx.clearRect(0,0,W,H);ctx.font='10px system-ui';
  for(let g=0;g<=5;g++){
    const yy=pad.t+g*ch/5,price=ymax-g*(ymax-ymin)/5;
    ctx.strokeStyle='#1d2b4c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(W-pad.r,yy);ctx.stroke();
    ctx.fillStyle='#8fa0c8';ctx.fillText(price>=1?price.toFixed(2):price.toFixed(5),W-pad.r+5,yy+3);
  }
  function level(v,label,color){
    const yy=y(v);ctx.strokeStyle=color;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(W-pad.r,yy);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=color;ctx.fillText(label,W-pad.r-18,yy-5);
  }
  level(r.chart.support,'S','#60a5fa'); level(r.chart.resistance,'R','#f59e0b');

  const cwidth=Math.max(1.2,Math.min(5,(cw/data.length)*.65));
  data.forEach((c,i)=>{
    const bull=c.close>=c.open,col=bull?'#34d399':'#fb7185',xx=x(i),yo=y(c.open),yc=y(c.close),yh=y(c.high),yl=y(c.low);
    ctx.strokeStyle=col;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(xx,yh);ctx.lineTo(xx,yl);ctx.stroke();
    ctx.fillStyle=col;ctx.fillRect(xx-cwidth/2,Math.min(yo,yc),cwidth,Math.max(1,Math.abs(yc-yo)));
  });
  function emaPath(key,color){
    ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();let started=false;
    data.forEach((c,i)=>{if(!Number.isFinite(c[key]))return;const xx=x(i),yy=y(c[key]);if(!started){ctx.moveTo(xx,yy);started=true;}else ctx.lineTo(xx,yy);});
    if(started)ctx.stroke();
  }
  emaPath('ema20','#a78bfa');emaPath('ema50','#22d3ee');emaPath('ema200','#facc15');

  const indexMap=new Map(data.map((c,i)=>[c.index,i]));
  r.chart.pivots.forEach(p=>{
    const i=indexMap.get(p.i);if(i===undefined)return;
    ctx.fillStyle=p.isHigh?'#f0abfc':'#93c5fd';ctx.font='bold 9px system-ui';
    ctx.fillText(p.label,x(i)-7,y(p.price)+(p.isHigh?-7:13));
  });
  r.chart.bos.forEach(b=>{
    const i=indexMap.get(b.i);if(i===undefined)return;
    ctx.fillStyle=b.bullish?'#6ee7b7':'#fda4af';ctx.font='bold 9px system-ui';
    ctx.fillText(b.label,x(i)+3,y(b.price)-8);
  });

  function showTip(clientX,clientY){
    const rr=canvas.getBoundingClientRect(),mx=clientX-rr.left,my=clientY-rr.top;
    if(mx<pad.l||mx>W-pad.r||my<pad.t||my>H-pad.b){tip.classList.add('hidden');return;}
    const i=Math.max(0,Math.min(data.length-1,Math.floor((mx-pad.l)/(cw/data.length)))),c=data[i],dt=new Date(c.time);
    tip.innerHTML=`<b>${dt.toLocaleString()}</b><br>O ${fmt(c.open,6)}<br>H ${fmt(c.high,6)}<br>L ${fmt(c.low,6)}<br>C ${fmt(c.close,6)}<br>V ${fmt(c.volume,2)}`;
    tip.style.left=Math.min(rr.width-175,Math.max(8,mx+10))+'px';tip.style.top=Math.max(8,my-88)+'px';tip.classList.remove('hidden');
  }
  canvas.onmousemove=e=>showTip(e.clientX,e.clientY);
  canvas.onmouseleave=()=>tip.classList.add('hidden');
  canvas.ontouchmove=e=>{if(e.touches[0])showTip(e.touches[0].clientX,e.touches[0].clientY);};
  canvas.ontouchend=()=>tip.classList.add('hidden');
}

$('backendUrl').value=localStorage.getItem('backendUrl')||'';
$('verifyBtn').addEventListener('click', async ()=>{
  if(!current){$('verification').textContent='حلّل السوق أولًا.';return;}
  const file=$('verifyImg').files[0],tf=$('verifyTf').value,base=$('backendUrl').value.trim().replace(/\/$/,'');
  if(!file){$('verification').textContent='اختر صورة الشارت.';return;}
  if(!base){$('verification').textContent='أدخل Backend URL.';return;}
  localStorage.setItem('backendUrl',base);
  const r=current.results.find(x=>x.timeframe===tf);
  if(!r){$('verification').textContent='لا توجد نتيجة لهذا الفريم.';return;}
  $('verification').textContent='جاري التحقق...';
  const fd=new FormData();
  fd.append('chart',file);fd.append('timeframe',tf);
  fd.append('numericSummary',`${tf}: score ${r.score}/100, direction ${r.direction}, RSI ${fmt(r.indicators.rsi14,2)}, ADX ${fmt(r.indicators.adx14,2)}, structure ${r.states.structure}, EMA ${r.states.emaOrder}`);
  try{
    const res=await fetch(base+'/api/verify-image',{method:'POST',body:fd});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'فشل التحقق.');
    const ar={supports:'الصورة تدعم التحليل الرقمي',conflicts:'الصورة تتعارض مع التحليل الرقمي',unclear:'الصورة غير واضحة'}[data.agreement]||'تم التحقق';
    $('verification').innerHTML=`<div class="verify"><b>${esc(ar)}</b><br>الثقة: ${data.confidence}%<br>${esc(data.notes||'')}</div>`;
  }catch(e){$('verification').textContent='خطأ: '+e.message;}
});

const lastSymbol=localStorage.getItem('lastSymbol'); if(lastSymbol)$('symbol').value=lastSymbol;
const lastMarket=localStorage.getItem('lastMarket'); if(lastMarket)$('market').value=lastMarket;
window.addEventListener('resize',()=>{if(current)renderTf();});
