import assert from 'node:assert/strict';
import {runFixture,shieldFetch,stats} from '../src/ghosteryShield.js';
import {createServer} from 'node:http';
const cases=runFixture();
for(const c of cases){assert.equal(c.passed,true,c.name);console.log('GHOSTERY PASS: '+c.name);}
await assert.rejects(()=>shieldFetch('https://ads.doubleclick.net/pixel'),/Blocked by Ghostery/);
const server=createServer((req,res)=>{res.end('ok');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const response=await shieldFetch('http://127.0.0.1:'+server.address().port+'/test');
 assert.equal(await response.text(),'ok');
 assert.equal(stats().blocked,1);
 console.log('GHOSTERY PASS: actual ad request rejected before network; real local request allowed');
}finally{server.close();}
