// A 1280x544 cinematic frame has the same horizontal detail as 720p HD.
// Require a plausible widescreen ratio and a minimum height: not a banner,
// thumbnail or a 480p source with an arbitrary width. Legacy height-only
// observations retain their existing threshold.
export function isHdVideo(width,height){
 if(!Number.isFinite(height)||height<1)return false;
 if(height>=720)return true;
 return Number.isFinite(width)&&width>=1280&&height>=540&&width/height>=1.9&&width/height<=2.5;
}
export function qualityScore(width,height){
 return isHdVideo(width,height)?Math.max(height,Number.isFinite(width)?Math.min(2160,width*9/16):0):0;
}
