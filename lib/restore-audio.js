export async function restoreAudioParts(files,decodeDuration,onProgress=()=>{}){
 const selected=Array.from(files);
 if(!selected.length||selected.length>200)throw Error('Choose between 1 and 200 downloaded audio parts.');
 let totalBytes=0;
 const numbered=selected.map(file=>{
  const match=/^lecture-part-(\d+)(?: \(\d+\))?\.webm$/i.exec(file.name);
  if(!match||Number(match[1])<1)throw Error('Keep the downloaded names: lecture-part-1.webm, lecture-part-2.webm, and so on.');
  if(file.size<100||file.size>4*1024*1024)throw Error(file.name+' must be a WebM audio part under 4 MB.');
  totalBytes+=file.size;return {file,number:Number(match[1])};
 }).sort((a,b)=>a.number-b.number);
 if(totalBytes>128*1024*1024)throw Error('The selected backups exceed 128 MB.');
 for(let i=0;i<numbered.length;i++)if(numbered[i].number!==i+1)throw Error('Select every part from Part 1 without gaps or duplicate downloads. Expected Part '+(i+1)+'.');
 const parts=[];let duration=0;
 for(const {file,number} of numbered){
  onProgress(number,numbered.length);
  const bytes=await file.arrayBuffer();
  if(bytes.byteLength<100||new DataView(bytes).getUint32(0)!==0x1a45dfa3)throw Error(file.name+' is not a valid WebM backup.');
  const seconds=await decodeDuration(bytes,file.name);
  if(!Number.isFinite(seconds)||seconds<=0||seconds>330)throw Error(file.name+' has an invalid duration or is longer than a supported audio part.');
  if(duration+seconds>11700+5)throw Error('These parts exceed the 3h 15m capture limit.');
  parts.push({blob:file,offset:duration,duration:seconds,transcript:null,status:'ready',originalName:file.name});
  duration+=seconds;
 }
 return {parts,duration};
}
