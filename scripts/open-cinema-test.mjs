import assert from 'node:assert/strict';
import {OPEN_FILMS,matchSeed,seedSource,archiveSource,openLicense,safeArchiveId} from '../src/openCinema.js';
const fixture={metadata:{identifier:'example-film',mediatype:'movies',title:'An Example Film',year:'1929',licenseurl:'https://creativecommons.org/publicdomain/mark/1.0/'},files:[{name:'film.mp4',size:'120000000',length:'1:20:00'},{name:'trailer.mp4',size:'150000000',length:'1:00'}]};
const cases=[
 ['creator film exact title and year',()=>assert.equal(matchSeed('Sita Sings the Blues','2008')?.key,'sita')],
 ['wrong year rejected',()=>assert.equal(matchSeed('Sita Sings the Blues','2020'),undefined)],
 ['all seed videos HTTPS',()=>assert.ok(OPEN_FILMS.every(f=>seedSource(f).stream_url.startsWith('https://')))],
 ['explicit license required',()=>{assert.equal(openLicense('https://other.example/creative-commons'),null);assert.equal(openLicense('https://creativecommons.org/licenses/by-nc/4.0/'),null)}],
 ['archive resolves actual MP4 not trailer',()=>assert.equal(archiveSource(fixture,{title:'An Example Film',year:'1929',minSeconds:2400})?.stream_url,'https://archive.org/download/example-film/film.mp4')],
 ['archive rejects wrong work',()=>assert.equal(archiveSource(fixture,{title:'Another Film',year:'1929'}),null)],
 ['archive rejects missing rights',()=>assert.equal(archiveSource({...fixture,metadata:{...fixture.metadata,licenseurl:undefined}}),null)],
 ['archive rejects short file',()=>assert.equal(archiveSource(fixture,{minSeconds:7200}),null)],
 ['archive rejects restricted item',()=>assert.equal(archiveSource({...fixture,metadata:{...fixture.metadata,access_restricted_item:true}}),null)],
 ['archive rejects unsafe identifier',()=>assert.equal(safeArchiveId('../test'),false)]
];for(const [name,fn] of cases){fn();console.log('OPEN CINEMA PASS: '+name)}
