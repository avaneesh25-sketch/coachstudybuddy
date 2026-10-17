'use client';
import {processingFetch} from '../lib/processing-client.js';
import {studyHeaders} from '../lib/study-client.js';
import {restoreAudioParts} from '../lib/restore-audio.js';
import {transcribeParts,readTranscriptionResponse} from '../lib/transcription-queue.js';
import {useEffect,useRef,useState} from 'react';
import {MAX_CAPTURE_SECONDS,PART_SECONDS,tabCaptureOptions,mergeCapturedParts} from '../lib/capture-session.js';
export default function LongAudioCapture({apiKey,config,onTranscript,onActiveChange=()=>{}}){
 const [failure,setFailure]=useState(''),[parts,setParts]=useState([]),[phase,setPhase]=useState('idle'),[seconds,setSeconds]=useState(0),[message,setMessage]=useState(''),[consent,setConsent]=useState(false),[speed,setSpeed]=useState(2),[origin,setOrigin]=useState(0);
 const session=useRef(null),mounted=useRef(true),items=useRef([]),locked=useRef(false),notify=useRef(onActiveChange);
 notify.current=onActiveChange;
 const [autoTranscribe,setAutoTranscribe]=useState(true),[transcribing,setTranscribing]=useState(false);
 const worker=useRef(false),paused=useRef(false),autoEnabled=useRef(true);
 autoEnabled.current=autoTranscribe;
 const busy=phase!=='idle';
 useEffect(()=>{notify.current(busy||transcribing||parts.some(p=>!p.transcript))},[busy,transcribing,parts]);
 useEffect(()=>{if(autoTranscribe&&!paused.current&&parts.some(p=>!p.transcript))void transcribe(true)},[parts,autoTranscribe]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const a=session.current;if(a){a.stopping=true;clearInterval(a.timer);clearTimeout(a.partTimer);if(a.recorder?.state==='recording')a.recorder.stop();a.media.getTracks().forEach(t=>t.stop());a.wake?.release().catch(()=>{});}items.current.forEach(p=>URL.revokeObjectURL(p.url));}},[]);
 useEffect(()=>{if(!busy&&!parts.length)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[busy,parts.length]);
 function update(){if(mounted.current)setParts([...items.current]);}
 function finish(a){clearInterval(a.timer);clearTimeout(a.partTimer);a.media.getTracks().forEach(t=>t.stop());a.wake?.release().catch(()=>{});session.current=null;locked.current=false;if(mounted.current){setPhase('idle');setMessage(a.error||'Capture finished. Completed parts transcribe automatically when enabled. Stop at the end of each lecture.');}}
 function stop(){const a=session.current;if(!a)return;a.stopping=true;clearTimeout(a.partTimer);if(a.recorder?.state==='recording'){if(mounted.current)setPhase('finishing');a.recorder.stop();}else finish(a);}
 function recordPart(a){
  if(a.stopping)return finish(a);
  try{
   const buffers=[];let size=0;const offset=(performance.now()-a.started)/1000;
   const r=new MediaRecorder(new MediaStream(a.media.getAudioTracks()),{mimeType:a.mime,audioBitsPerSecond:64000});a.recorder=r;
   r.ondataavailable=e=>{if(e.data.size){buffers.push(e.data);size+=e.data.size;if(size>3.5*1024*1024&&r.state==='recording')r.stop();}};
   r.onerror=()=>{a.error='Capture failed. Completed parts remain available.';a.stopping=true;if(r.state==='recording')r.stop();};
   r.onstop=()=>{clearTimeout(a.partTimer);const blob=new Blob(buffers,{type:a.mime});if(mounted.current&&blob.size>100){items.current.push({blob,url:URL.createObjectURL(blob),offset,transcript:null});update();}if(!mounted.current||a.stopping)return finish(a);recordPart(a);};
   r.start(1000);a.partTimer=setTimeout(()=>{if(r.state==='recording')r.stop()},PART_SECONDS*1000);
  }catch(e){a.error=e.message;finish(a);}
 }
 async function start(){
  if(locked.current||worker.current||!consent)return;locked.current=true;setPhase('starting');setMessage('');
  let media;
  try{
   if(!Number.isFinite(Number(origin))||Number(origin)<0)throw Error('Enter a valid starting position.');
   if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Use Chrome or Edge and select the lecture tab.');
   media=await navigator.mediaDevices.getDisplayMedia(tabCaptureOptions);
   if(!mounted.current)throw Error('Capture cancelled.');
   if(media.getVideoTracks()[0]?.getSettings().displaySurface!=='browser')throw Error('Choose a Chrome Tab, not the entire screen or a window.');
   if(!media.getAudioTracks().length)throw Error('Enable Share tab audio in the browser prompt.');
   const mime=['audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw Error('WebM audio capture is unavailable.');
   items.current.forEach(p=>URL.revokeObjectURL(p.url));items.current=[];update();
   const a={media,mime,started:performance.now(),stopping:false,speed,origin:Number(origin)};session.current=a;
   media.getTracks().forEach(t=>t.addEventListener('ended',stop,{once:true}));
   a.timer=setInterval(()=>{const elapsed=(performance.now()-a.started)/1000;if(mounted.current)setSeconds(Math.floor(elapsed));if(elapsed>=MAX_CAPTURE_SECONDS)stop()},500);
   setSeconds(0);setPhase('recording');recordPart(a);
   navigator.wakeLock?.request('screen').then(w=>{if(session.current===a)a.wake=w;else w.release()}).catch(()=>{});
  }catch(e){media?.getTracks().forEach(t=>t.stop());session.current=null;locked.current=false;if(mounted.current){setPhase('idle');setMessage(e.message);}}
 }
 async function restore(e){
  const files=Array.from(e.target.files||[]);e.target.value='';
  if(!files.length||locked.current||worker.current)return;
  if(items.current.length&&!window.confirm('Replace the audio currently in this tab with these backups? Existing transcription progress will be replaced.'))return;
  locked.current=true;setPhase('restoring');setFailure('');
  let context;const urls=[];
  try{
   const AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)throw Error('Use Chrome or Edge to restore WebM audio.');
   context=new AudioContextClass();
   const restored=await restoreAudioParts(files,async(bytes,name)=>{
    try{return (await context.decodeAudioData(bytes)).duration;}catch{throw Error(name+' could not be decoded. Check that this backup plays correctly.');}
   },(n,total)=>{if(mounted.current)setMessage('Checking audio part '+n+' of '+total);});
   if(!mounted.current)return;
   const next=restored.parts.map(p=>{const url=URL.createObjectURL(p.blob);urls.push(url);return {...p,url};});
   items.current.forEach(p=>URL.revokeObjectURL(p.url));items.current=next;update();
   setSeconds(Math.round(restored.duration));
   setMessage('Restored '+next.length+' audio parts in order. Audio backups do not contain previous transcripts; these parts need transcription again. Timestamps use cumulative audio duration and may omit small recording gaps.');
  }catch(e){urls.forEach(url=>URL.revokeObjectURL(url));if(mounted.current)setFailure(e.message||'Restore failed.');}
  finally{try{await context?.close()}catch{}locked.current=false;if(mounted.current)setPhase('idle');}
 }
 async function transcribe(automatic=false){
  if(worker.current||!apiKey||!mounted.current)return;worker.current=true;paused.current=false;setTranscribing(true);
  try{
   setFailure('');
   await transcribeParts(items.current,async(p,signal)=>{
    if(!mounted.current||(automatic&&!autoEnabled.current))throw Error('Automatic transcription paused. Resume remaining parts when ready.');
    if(p.blob.size>4*1024*1024)throw Error('Audio exceeds the upload limit; download this part for recovery.');
    return readTranscriptionResponse(await processingFetch('transcribe',config,{method:'POST',signal,headers:{'Content-Type':'audio/webm',...(config.managed?{}:{'x-api-key':apiKey}),'x-provider':config.provider,'x-base-url':config.baseUrl||'','x-model':config.model,'x-audio-model':config.audioModel||'',...(config.managed?studyHeaders(config.lecture):{})},body:p.blob}));
   },(i)=>{if(!mounted.current)return;update();setMessage('Part '+(i+1)+' of '+items.current.length+' · '+items.current.filter(p=>p.transcript).length+' completed');const done=items.current.filter(p=>p.transcript);if(done.length)onTranscript(mergeCapturedParts(done,speed,Number(origin)));});
   if(mounted.current){onTranscript(mergeCapturedParts(items.current,speed,Number(origin)));setMessage('Transcript ready. Use Generate & download PDF below when recording is finished.');}
  }catch(e){paused.current=true;if(mounted.current){setFailure(e.message||'Transcription stopped. Your audio is preserved.');setMessage(e.message);}}finally{worker.current=false;if(mounted.current)setTranscribing(false);}
 }
 return <section><h3>Capture lecture tab audio · up to 3h 15m</h3><p>Select Chrome Tab and enable Share tab audio. No microphone is used. Quiet playback is requested from Chrome; keep the video player unmuted. Keep this page open and the computer awake.</p><p>Set the player to 2× if it offers that speed, then start playback from the position below. Capture does not change the player speed. Do not pause, seek or change speed while recording.</p><label>Player speed<select value={speed} disabled={busy||parts.length>0} onChange={e=>setSpeed(Number(e.target.value))}><option value={2}>2× — set in the player</option><option value={1}>1×</option></select></label><label>Starting video position (seconds)<input type="number" min="0" value={origin} disabled={busy||parts.length>0} onChange={e=>setOrigin(e.target.value)}/></label><section className="notice"><h4>Restore downloaded audio parts</h4><p>Choose the correct lecture first. Set the playback speed and starting position above to match the original recording, then select all its lecture-part-*.webm files together. Files are checked locally and sorted by part number; automatic transcription starts after import when enabled.</p><label className="drop">Select all downloaded audio parts<input type="file" multiple accept=".webm,audio/webm" disabled={busy||transcribing} onChange={restore}/></label></section>{failure&&<p role="alert" className="feedback">{failure}</p>}<label className="check"><input type="checkbox" checked={autoTranscribe} onChange={e=>{paused.current=false;setAutoTranscribe(e.target.checked)}}/>Automatically transcribe completed parts</label><p>Each completed part is sent to the site’s transcription service while recording continues. Usage limits apply. Errors pause transcription; recording and backups are preserved.</p><label className="check"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>I am permitted to capture this content.</label><button className="primary" disabled={busy||transcribing||!consent||parts.length>0} onClick={start}>Share tab &amp; start capture</button><button className="secondary" disabled={phase!=='recording'} onClick={stop}>Stop capture</button><p role="status">{phase} · {Math.floor(seconds/60)}m {seconds%60}s / 195m · {message}</p><p>Audio is retained in separate playable parts in this tab. Download backups before closing it. Transcription sends each part to the configured AI provider; usage limits apply. Successful parts are retained for retry.</p>{parts.map((p,i)=><details key={i}><summary>Part {i+1} · {p.transcript?'transcribed':p.status==='failed'?'needs retry':p.status==='transcribing'?'transcribing…':'ready'}</summary>{p.error&&<p role="alert">{p.error}</p>}<audio controls src={p.url}/><a href={p.url} download={'lecture-part-'+(i+1)+'.webm'}>Download audio part {i+1}</a></details>)}{!!parts.length&&<>{failure&&<p role="alert" className="feedback">{failure} Successful parts will not be sent again.</p>}<p role="status">{parts.filter(p=>p.transcript).length} of {parts.length} parts transcribed.</p><button className="primary" disabled={transcribing||!apiKey} onClick={()=>transcribe(false)}>{transcribing?'Transcription in progress…':parts.some(p=>p.transcript)?'Resume remaining parts':'Transcribe all parts'}</button><button className="secondary" disabled={busy||transcribing} onClick={()=>{if(!window.confirm('Discard this recording? Download any backups first.'))return;items.current.forEach(p=>URL.revokeObjectURL(p.url));items.current=[];update();setSeconds(0);paused.current=false;onTranscript(null);}}>Clear recording</button></>}</section>;
}



