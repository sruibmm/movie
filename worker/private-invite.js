// Signed, expiring read-only invitations. The owner's master secret is never in the link.
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createInvitation(secret,now=Date.now()){
 const expiry=now+30*86400000,nonce=b64(crypto.getRandomValues(new Uint8Array(16)));
 const payload='v1.'+expiry+'.'+nonce;
 return {token:payload+'.'+b64(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(payload))),expiresAt:expiry};
}
export async function verifyInvitation(token,secret,now=Date.now()){
 if(typeof token!=='string'||token.length>180||typeof secret!=='string'||secret.length<32)return false;
 const parts=token.split('.');if(parts.length!==4||parts[0]!=='v1'||!/^\d{13}$/.test(parts[1])||!/^[-_a-zA-Z0-9]{22}$/.test(parts[2])||!/^[-_a-zA-Z0-9]{43}$/.test(parts[3]))return false;
 const exp=Number(parts[1]);if(exp<=now||exp>now+30*86400000)return false;
 try{return await crypto.subtle.verify('HMAC',await key(secret),unb64(parts[3]),enc.encode(parts.slice(0,3).join('.')));}catch{return false;}
}
