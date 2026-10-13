export const MAX_CAPTURE_SECONDS = 3 * 60 * 60 + 15 * 60;
export const PART_SECONDS = 240;
export const tabCaptureOptions = {video:{displaySurface:'browser'},audio:{suppressLocalAudioPlayback:true},selfBrowserSurface:'exclude',systemAudio:'exclude',surfaceSwitching:'exclude'};
export function mergeCapturedParts(parts, speed=1, origin=0){
 if(![1,2].includes(speed)||!Number.isFinite(origin)||origin<0)throw Error('Invalid playback timing.');
 const segments=[];
 for(const part of parts){
  if(!part.transcript)throw Error('Transcribe every part before building notes.');
  for(const s of part.transcript.segments||[])segments.push({...s,id:segments.length+1,start:origin+(part.offset+s.start)*speed,end:origin+(part.offset+s.end)*speed});
 }
 if(!segments.length)throw Error('No speech was detected.');
 return {segments,text:segments.map(s=>s.text).join(' '),origin:'captured-tab',clock:'Approximate video timestamps mapped from '+speed+'× playback. Do not seek, pause or change speed during capture; brief part boundaries may omit audio.'};
}
