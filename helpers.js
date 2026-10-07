require(process.env.ENGINE||'../decision-engine.js');
const E=globalThis.UnifiedDecisionEngine;
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
// Hourly path with volatility clustering. drift/phi control edge: phi>0 => momentum (real edge), 0 => random walk
function makeHourly(nHours,seed,{phi=0,volBase=0.004,drift=0,mu=0,flip=1/150}={}){
  const r=rng(seed);let p=100,vol=volBase,prevRet=0,state=0;const out=[];const t0=Date.UTC(2023,0,1);
  for(let i=0;i<nHours;i++){
    vol=Math.max(0.0015,volBase*0.05+0.95*vol+0.08*Math.abs(prevRet)*0.5+0.002*0);
    vol=Math.min(vol,0.03);
    if(mu&&r()<flip){const u=r();state=u<.4?1:u<.8?-1:0;}
    const ret=drift+state*mu+phi*prevRet+vol*gauss(r);prevRet=ret;
    const open=p,close=p*Math.exp(ret);
    const wig=Math.abs(gauss(r))*vol*0.6;
    const high=Math.max(open,close)*(1+wig*0.5),low=Math.min(open,close)*(1-wig*0.5);
    out.push({time:t0+i*3600e3,open,high,low,close,volume:1000*(1+Math.abs(ret)/vol*0.3)*(0.7+0.6*r()),closeTime:t0+(i+1)*3600e3-1});
    p=close;
  }
  return out;
}
function aggregate(h,k){const out=[];for(let i=0;i+k<=h.length;i+=k){const g=h.slice(i,i+k);out.push({time:g[0].time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g.at(-1).close,volume:g.reduce((s,x)=>s+x.volume,0),closeTime:g.at(-1).closeTime});}return out;}
function buildSets(seed,opts){
  const h=makeHourly(2500*24,seed,opts);
  return{H1:h.slice(-(opts&&opts.bars||4000)),D1:aggregate(h,24).slice(-2500)};
}
module.exports={E,rng,gauss,makeHourly,aggregate,buildSets};
