// Pure, testable remote gesture and provider-message helpers.
export function doubleTap(last,key,now,repeat=false,windowMs=380){
 if(repeat)return {last,delta:0};
 if(key!==37&&key!==39)return {last:null,delta:0};
 if(last&&last.key===key&&now-last.at>=0&&now-last.at<=windowMs)return {last:null,delta:key===39?10:-10};
 return {last:{key,at:now},delta:0};
}
export const cineOrigin='https://cinesrc.st';
export function cineMessage(frame,e){return !!frame&&e.origin===cineOrigin&&e.source===frame.contentWindow&&typeof e.data?.type==='string'&&e.data.type.startsWith('cinesrc:');}
export function cineCommand(frame,command,args=[]){if(!frame?.contentWindow)return false;let url;try{url=new URL(frame.src);}catch{return false;}if(url.origin!==cineOrigin)return false;frame.contentWindow.postMessage({type:'cinesrc:command',command,args},cineOrigin);return true;}
