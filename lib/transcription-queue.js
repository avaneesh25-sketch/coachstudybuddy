export async function transcribeParts(parts, request, onProgress=()=>{}, {timeoutMs=150000}={}){
 for(let i=0;i<parts.length;i++){
  const part=parts[i];if(part.transcript)continue;
  part.error=null;part.status='transcribing';onProgress(i,parts);
  const controller=new AbortController();let timer;
  try{
   const data=await Promise.race([
    Promise.resolve().then(()=>request(part,controller.signal)),
    new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('The request timed out. Your audio is preserved; resume when ready.'));controller.abort();},timeoutMs);})
   ]);
   if(!Array.isArray(data?.segments)||!data.segments.length)throw Error('No transcript was returned for this part. Listen to the audio before retrying.');
   part.transcript=data;part.status='transcribed';
  }catch(e){
   part.status='failed';part.error=e?.message||'The request stopped unexpectedly.';
   throw Error('Part '+(i+1)+' of '+parts.length+': '+part.error);
  }finally{clearTimeout(timer);onProgress(i,parts);}
 }
}
export async function readTranscriptionResponse(response){
 let data;try{data=await response.json()}catch{throw Error('The server returned an unreadable response (HTTP '+response.status+'). Your audio is preserved.');}
 if(!response.ok)throw Error(data?.error||'Transcription failed (HTTP '+response.status+'). Your audio is preserved.');
 return data;
}
