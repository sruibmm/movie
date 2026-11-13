// Stable legacy slots: never reindex, since saved history and peer rooms exchange numeric IDs.
// Both domains are listed as retired by the provider's published domain register (2026-11-13).
export const RETIRED_SERVER_IDS = new Set([1,9]);
export const ACTIVE_SERVER_IDS = Object.freeze([10,0,2,3,4,5,6,7,8]);
export function normalizeServerId(value) {
  const id=Number(value);
  return ACTIVE_SERVER_IDS.includes(id)?id:ACTIVE_SERVER_IDS[0];
}
export function nextServerId(current) {
  const at=ACTIVE_SERVER_IDS.indexOf(normalizeServerId(current));
  return ACTIVE_SERVER_IDS[(at+1)%ACTIVE_SERVER_IDS.length];
}
export function pickProtectedSource(observations, count, current=-1) {
  const eligible=ACTIVE_SERVER_IDS.filter(i=>i<count && i!==current && !['ad','blocked'].includes(observations[i]?.status));
  return eligible.sort((a,b)=>(observations[b]?.status==='clean'?1:0)-(observations[a]?.status==='clean'?1:0))[0] ?? null;
}
