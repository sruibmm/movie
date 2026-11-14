import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {normalizeLicensedCatalog} from '../src/licensedCatalog.js';

function validated(doc, label){
  const titles=normalizeLicensedCatalog(doc);
  const declared=doc.titles.reduce((n,t)=>n+(Array.isArray(t?.assets)?t.assets.length:0),0);
  if(titles.length!==doc.titles.length||titles.reduce((n,t)=>n+t.assets.length,0)!==declared)
    throw Error(label+': invalid/duplicate title or asset, rights, territory or URL');
  return titles;
}

function merge(existing, incoming){
  const old=validated(existing,'Existing catalog');
  const fresh=validated(incoming,'Incoming catalog');
  const titles=new Map(old.map(t=>[t.id,t]));
  const owners=new Map();
  const slots=new Map();
  const slot=(t,a)=>t.kind==='tv'?JSON.stringify([t.id,a.season,a.episode]):null;
  function index(t,a){
    const k=slot(t,a);
    if(owners.has(a.id))throw Error('Duplicate asset: '+a.id);
    if(k&&slots.has(k))throw Error('Duplicate episode slot: '+k);
    owners.set(a.id,{title:t.id,slot:k,format:a.format,url:a.url});
    if(k)slots.set(k,a.id);
  }
  for(const t of old)for(const a of t.assets)index(t,a);
  for(const t of fresh){
    let target=titles.get(t.id);
    if(target&&(target.kind!==t.kind||target.title.trim()!==t.title.trim()))throw Error('Title identity conflict: '+t.id);
    if(!target){target={...t,assets:[]};titles.set(t.id,target);}
    for(const a of t.assets){
      const known=owners.get(a.id),k=slot(t,a);
      if(known){
        if(known.title!==t.id||known.slot!==k||known.format!==a.format||known.url!==a.url)throw Error('Asset identity conflict: '+a.id);
        // Same identity: allow refreshed rights and metadata, never silent remapping.
        target.assets[target.assets.findIndex(x=>x.id===a.id)]=a;
      }else{
        index(t,a);target.assets.push(a);
      }
    }
  }
  return {version:1,titles:validated({version:1,titles:[...titles.values()]},'Merged catalog')};
}

if(process.argv[2]==='--self-test'){
  const rights={reference:'TEST',provider:'TEST',adFree:true,webPlayback:true,territories:['KW'],expires:'2099-01-01'};
  const asset=(id,episode)=>({id,title:'Episode '+episode,season:1,episode,format:'mp4',url:'https://example.com/'+id+'.mp4',rights});
  const doc=(...assets)=>({version:1,titles:[{id:'series',title:'Test series',kind:'tv',assets}]});
  const a=asset('a',1),b=asset('b',2);
  const combined=merge(doc(a),doc(b));
  assert.equal(combined.titles[0].assets.length,2);
  assert.deepEqual(merge(combined,doc(b)),combined);
  assert.throws(()=>merge(combined,doc(asset('c',2))),/Duplicate episode/);
  assert.throws(()=>merge(combined,doc(asset('a',3))),/identity conflict/);
  assert.throws(()=>merge(combined,doc({...b,rights:{...rights,webPlayback:false}})),/rights/);
  assert.throws(()=>merge(doc(a),doc(a,b,{...b,id:'c'})),/Duplicate episode/);
  console.log('IMPORT MERGE PASS: preserve, idempotency, duplicate slots, identity, rights, incoming conflict');
}else{
  const file=process.argv[2];
  if(!file)throw Error('Usage: npm run import:licensed -- provider-manifest.json (or --self-test)');
  const dest=new URL('../public/licensed-arabic.json',import.meta.url);
  const existing=JSON.parse(await fs.readFile(dest,'utf8'));
  const incoming=JSON.parse(await fs.readFile(file,'utf8'));
  const output=merge(existing,incoming);
  const tmp=new URL('./licensed-arabic.json.'+process.pid+'.tmp',dest);
  try{await fs.writeFile(tmp,JSON.stringify(output),{flag:'wx'});await fs.rename(tmp,dest);}finally{await fs.rm(tmp,{force:true});}
  console.log('Catalog now has '+output.titles.length+' titles and '+output.titles.reduce((n,t)=>n+t.assets.length,0)+' assets');
}
