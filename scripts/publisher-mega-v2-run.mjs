import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {PUBLISHER_FILMS} from '../src/officialCatalog.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const python=process.env.PYTHON||'python';
const run=(cmd,args)=>new Promise((resolve,reject)=>{
 const p=spawn(cmd,args,{stdio:'inherit',shell:false});
 p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(cmd+' '+args.join(' ')+' exited '+code)));
});
const node=script=>run(process.execPath,[script]);
const py=script=>run(python,[script]);
fs.writeFileSync('.cinema-film-known.json',JSON.stringify([...PUBLISHER_FILMS,...read('src/arabicBulkCatalog.json').films,...read('src/arabicPublisherExpansion.json').films].map(f=>({id:f.video||f.id,title:f.title,tmdbId:f.tmdbId}))));
await node('scripts/publisher-playlist-known.mjs');
await Promise.all([py('scripts/publisher-playlist-mega-v2.py'),py('scripts/publisher-official-hubs.py')]);
await Promise.all([py('scripts/publisher-playlist-mega-import.py'),py('scripts/publisher-hub-series-import.py'),py('scripts/publisher-aflam-import.py'),py('scripts/publisher-direct-film-import.py')]);
await run(process.execPath,['scripts/publisher-episode-batch-verify.mjs','docs/publisher-hub-series-approved.json','docs/publisher-hub-series-verified.json']);
await run(process.execPath,['scripts/publisher-episode-batch-verify.mjs','docs/publisher-playlist-mega-approved.json','docs/publisher-playlist-mega-verified.json']);
await node('scripts/publisher-mega-v2-merge.mjs');
console.log('MEGA V2 COMPLETE');
