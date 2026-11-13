import React,{useEffect,useState} from 'react';
import {initShield,stats,runFixture,shieldFetch} from './ghosteryShield.js';

export default function GhosteryLab(){
 const [open,setOpen]=useState(false);
 const [result,setResult]=useState(null);
 const [metrics,setMetrics]=useState(stats());
 useEffect(()=>{let active=true;initShield().then(()=>{if(active)setMetrics(stats());});return()=>{active=false;};},[]);
 useEffect(()=>{if(!open)return;const id=setInterval(()=>setMetrics(stats()),500);return()=>clearInterval(id);},[open]);
 const test=async()=>{
   const rows=runFixture();
   // This deliberately attempts an ad URL through the same app-level network gate.
   let cancelled=false;try{await shieldFetch('https://ads.doubleclick.net/pixel');}catch(e){cancelled=String(e.message).includes('Blocked by Ghostery');}
   let allowed=false;try{const response=await shieldFetch('/ghostery-probe.json');allowed=response.ok&&(await response.json()).ok===true;}catch{}
   setResult([...rows,{name:'Ad request refused before fetch',passed:cancelled},{name:'Real same-site request succeeds',passed:allowed}]);
   setMetrics(stats());
 };
 return <div className="fixed bottom-3 left-3 z-[1500]" dir="ltr">
  {open&&<section className="mb-2 w-[min(340px,calc(100vw-24px))] max-h-[70vh] overflow-auto bg-zinc-950 border border-purple-500/40 rounded-xl p-4 text-white shadow-2xl">
   <h2 className="font-bold text-purple-300">Ghostery experiment</h2>
   <p className="text-xs text-gray-300 mt-2">Real Ghostery engine for fetch calls made by this website. Cross-origin movie iframes and their internal requests are NOT covered. No change to existing movie sources.</p>
   <p className="text-xs mt-3">Rules: {metrics.status}</p><p className="text-xs">App requests checked: {metrics.checked} · blocked: {metrics.blocked}</p>
   <button onClick={test} className="mt-3 bg-purple-700 rounded-lg px-3 py-2 text-sm font-bold">Run real request test</button>
   {result&&<div className="mt-3 space-y-1">{result.map(r=><p key={r.name} className={'text-xs '+(r.passed?'text-green-300':'text-red-300')}>{r.passed?'PASS':'FAIL'} · {r.name}</p>)}</div>}
   <p className="text-[10px] mt-3 text-gray-400">A passed test verifies app-level blocking only. It does not certify a two-hour ad-free movie.</p>
  </section>}
  <button onClick={()=>setOpen(v=>!v)} className="bg-zinc-900 text-purple-200 border border-purple-500/50 rounded-full px-3 py-2 text-xs font-bold">🧪 Ghostery {open?'×':'Lab'}</button>
 </div>;
}
