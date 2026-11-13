import assert from 'node:assert/strict';
import {languageCode,originalAudioIndex,arabicSubtitleIndex,orderedSubtitles} from '../src/mediaLanguages.js';
const cases=[
['language codes',()=>{assert.equal(languageCode('ar-SA'),'ar');assert.equal(languageCode('Arabic'),'ar');assert.equal(languageCode('kor'),'ko')}],
['original language not English by default',()=>assert.equal(originalAudioIndex([{lang:'en',name:'English dub'},{lang:'ko',name:'Korean original'}],'ko'),1)],
['skip commentary',()=>assert.equal(originalAudioIndex([{lang:'es',name:'Commentary'},{lang:'es',name:'Spanish original'}],'es'),1)],
['no matching audio',()=>assert.equal(originalAudioIndex([{lang:'en'}],'ja'),-1)],
['Arabic full track preferred',()=>assert.equal(arabicSubtitleIndex([{lang:'ar',forced:true},{lang:'en'},{lang:'ara',name:'Arabic full'}]),2)],
['no fake Arabic fallback',()=>assert.equal(arabicSubtitleIndex([{lang:'en'}]),-1)],
['only valid URL and preferred language',()=>assert.deepEqual(orderedSubtitles([{lang:'en',url:'https://example.org/en.vtt'},{language:'Arabic',url:'https://example.org/ar.vtt'},{lang:'ar',url:'javascript:bad'}]).map(t=>t.lang),['ar','en'])]
];for(const [name,run] of cases){run();console.log('LANGUAGE PASS: '+name);}
