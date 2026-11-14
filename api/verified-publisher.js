import {PUBLISHER_INDEX,publisherSourceFor,matchIndexedPublishers} from '../src/arabicLibraryIndex.js';
async function verify(row){const c=new AbortController(),t=setTimeout(()=>c.abort(),6500);try{const r=await fetch('https://www.youtube.com/oembed?'+new URLSearchParams({url:'https://www.youtube.com/watch?v='+row.id,format:'json'}),{signal:c.signal});if(!r.ok)return null;return publisherSourceFor(row,await r.json());}catch{return null;}finally{clearTimeout(t);}}
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'GET only'});const id=String(req.query.id||'');
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=900');
 if(id){const row=PUBLISHER_INDEX.find(v=>v.id===id);if(!row)return res.status(404).json({error:'Unknown work'});const source=await verify(row);return res.json({source,verified:!!source});}
 const title=String(req.query.title||'').trim().slice(0,280);if(!title)return res.status(400).json({error:'Missing title'});
 const rows=matchIndexedPublishers({title,type:String(req.query.type||'movie'),runtime:Number(req.query.runtime)||0,year:Number(req.query.year)||0});
 const items=(await Promise.all(rows.map(verify))).filter(Boolean);
 return res.json({items,configured:true,source:'local-publisher-index'});
}
