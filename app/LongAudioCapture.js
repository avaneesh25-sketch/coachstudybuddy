'use client';
import {transcribeParts,readTranscriptionResponse} from '../lib/transcription-queue.js';
import {useEffect,useRef,useState} from 'react';
import {MAX_CAPTURE_SECONDS,PART_SECONDS,tabCaptureOptions,mergeCapturedParts} from '../lib/capture-session.js';
export default function LongAudioCapture({apiKey,config,onTranscript,onActiveChange=()=>{}}){
 const [failure,setFailure]=useState(''),[parts,setParts]=useState([]),[phase,setPhase]=useState('idle'),[seconds,setSeconds]=useState(0),[message,setMessage]=useState(''),[consent,setConsent]=useState(false),[speed,setSpeed]=useState(2),[origin,setOrigin]=useState(0);
 const session=useRef(null),mounted=useRef(true),items=useRef([]),locked=useRef(false),notify=useRef(onActiveChange);
 notify.current=onActiveChange;
 const busy=phase!=='idle';
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const a=session.current;if(a){a.stopping=true;clearInterval(a.timer);clearTimeout(a.partTimer);if(a.recorder?.state==='recording')a.recorder.stop();a.media.getTracks().forEach(t=>t.stop());a.wake?.release().catch(()=>{});}items.current.forEach(p=>URL.revokeObjectURL(p.url));notify.current(false);}},[]);
 useEffect(()=>{if(!busy&&!parts.length)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[busy,parts.length]);
 function update(){if(mounted.current)setParts([...items.current]);}
 function finish(a){clearInterval(a.timer);clearTimeout(a.partTimer);a.media.getTracks().forEach(t=>t.stop());a.wake?.release().catch(()=>{});session.current=null;locked.current=false;notify.current(false);if(mounted.current){setPhase('idle');setMessage(a.error||'Capture finished. Listen to the parts, then transcribe. Stop at the end of each lecture.');}}
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
  if(locked.current||!consent)return;locked.current=true;setPhase('starting');notify.current(true);setMessage('');
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
  }catch(e){media?.getTracks().forEach(t=>t.stop());session.current=null;locked.current=false;notify.current(false);if(mounted.current){setPhase('idle');setMessage(e.message);}}
 }
 async function transcribe(){
  if(locked.current||!apiKey)return;locked.current=true;setPhase('transcribing');notify.current(true);
  try{
   setFailure('');
   await transcribeParts(items.current,async(p,signal)=>{
    if(p.blob.size>4*1024*1024)throw Error('Audio exceeds the upload limit; download this part for recovery.');
    return readTranscriptionResponse(await fetch('/api/transcribe',{method:'POST',signal,headers:{'Content-Type':'audio/webm','x-api-key':apiKey,'x-provider':config.provider,'x-base-url':config.baseUrl||'','x-model':config.model,'x-audio-model':config.audioModel||''},body:p.blob}));
   },(i)=>{update();setMessage('Part '+(i+1)+' of '+items.current.length+' · '+items.current.filter(p=>p.transcript).length+' completed');});
   onTranscript(mergeCapturedParts(items.current,speed,Number(origin)));setMessage('Transcript ready. Return to Build study material.');
  }catch(e){setFailure(e.message||'Transcription stopped. Your audio is preserved.');setMessage(e.message);}finally{locked.current=false;setPhase('idle');notify.current(false);}
 }
 return <section><h3>Capture lecture tab audio · up to 3h 15m</h3><p>Select Chrome Tab and enable Share tab audio. No microphone is used. Quiet playback is requested from Chrome; keep the video player unmuted. Keep this page open and the computer awake.</p><p>Set the player to 2× if it offers that speed, then start playback from the position below. Capture does not change the player speed. Do not pause, seek or change speed while recording.</p><label>Player speed<select value={speed} disabled={busy||parts.length>0} onChange={e=>setSpeed(Number(e.target.value))}><option value={2}>2× — set in the player</option><option value={1}>1×</option></select></label><label>Starting video position (seconds)<input type="number" min="0" value={origin} disabled={busy||parts.length>0} onChange={e=>setOrigin(e.target.value)}/></label><label className="check"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>I am permitted to capture this content.</label><button className="primary" disabled={busy||!consent||parts.length>0} onClick={start}>Share tab &amp; start capture</button><button className="secondary" disabled={phase!=='recording'} onClick={stop}>Stop capture</button><p role="status">{phase} · {Math.floor(seconds/60)}m {seconds%60}s / 195m · {message}</p><p>Audio is retained in separate playable parts in this tab. Download backups before closing it. Transcription sends each part to your AI provider; charges apply. Successful parts are retained for retry.</p>{parts.map((p,i)=><details key={i}><summary>Part {i+1} · {p.transcript?'transcribed':p.status==='failed'?'needs retry':p.status==='transcribing'?'transcribing…':'ready'}</summary>{p.error&&<p role="alert">{p.error}</p>}<audio controls src={p.url}/><a href={p.url} download={'lecture-part-'+(i+1)+'.webm'}>Download audio part {i+1}</a></details>)}{!!parts.length&&<>{failure&&<p role="alert" className="feedback">{failure} Successful parts will not be sent again.</p>}<p role="status">{parts.filter(p=>p.transcript).length} of {parts.length} parts transcribed.</p><button className="primary" disabled={busy||!apiKey} onClick={transcribe}>{phase==='transcribing'?'Transcription in progress…':parts.some(p=>p.transcript)?'Resume remaining parts':'Transcribe all parts'}</button><button className="secondary" disabled={busy} onClick={()=>{if(!window.confirm('Discard this recording? Download any backups first.'))return;items.current.forEach(p=>URL.revokeObjectURL(p.url));items.current=[];update();setSeconds(0);}}>Clear recording</button></>}</section>;
}
