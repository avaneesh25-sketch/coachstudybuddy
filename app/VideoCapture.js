'use client';
import {useEffect,useRef,useState} from 'react';
import {recordingWriter} from '../lib/recording-writer';

export default function VideoCapture({token}) {
 const [name,setName]=useState('SAMA7101 - Session 1'),[handle,setHandle]=useState(null),[phase,setPhase]=useState('idle'),[message,setMessage]=useState(''),[consent,setConsent]=useState(false),[seconds,setSeconds]=useState(0),[bytes,setBytes]=useState(0);
 const active=useRef(null),mounted=useRef(true),locked=useRef(false);
 const running=phase==='recording',busy=phase==='starting'||phase==='saving';
 function stop(){const a=active.current;if(a?.recorder.state==='recording')a.recorder.stop();}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop();active.current?.media.getTracks().forEach(t=>t.stop());}},[]);
 useEffect(()=>{if(!running&&!busy)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[running,busy]);
 async function choose(){setMessage('');if(!window.showSaveFilePicker){setMessage('Full-session recording requires Chrome or Edge with direct file saving. Open this app there.');return;}try{const file=await window.showSaveFilePicker({suggestedName:(name.replace(/[<>:"/\\|?*]/g,' ').trim()||'lecture')+'.webm',types:[{description:'Lecture video',accept:{'video/webm':['.webm']}}]});setHandle(file);}catch(e){if(e.name!=='AbortError')setMessage(e.message);}}
 async function start(){
  if(locked.current||!handle||!consent)return;locked.current=true;setPhase('starting');setMessage('');setSeconds(0);setBytes(0);
  let media,file,wake;
  try{
   const access=await fetch('/api/video-access',{method:'POST',headers:{'x-github-token':token}});if(!access.ok)throw Error('Verify your personal account again before recording.');if(!mounted.current)return;
   media=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
   if(!mounted.current)throw Error('Capture cancelled.');
   if(!media.getAudioTracks().length)throw Error('No lecture audio was shared. Choose the lecture tab and enable Share tab audio.');
   const type=['video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!type)throw Error('Video recording is unavailable in this browser.');
   file=await handle.createWritable();if(!mounted.current)throw Error('Capture cancelled.');
   const recorder=new MediaRecorder(media,{mimeType:type,videoBitsPerSecond:2500000,audioBitsPerSecond:128000});
   let failed=false,total=0;const started=Date.now();
   const report=e=>{failed=true;if(mounted.current)setMessage(e.message||'Recording failed. Check the partial file.');stop();};
   const writer=recordingWriter(file,report);active.current={recorder,media};
   try{wake=await navigator.wakeLock?.request('screen');}catch{}
   if(!mounted.current)throw Error('Capture cancelled.');
   const timer=setInterval(()=>{if(mounted.current)setSeconds(Math.floor((Date.now()-started)/1000));},1000);
   recorder.ondataavailable=e=>{writer.write(e.data);total+=e.data.size;if(mounted.current)setBytes(total);};
   recorder.onerror=()=>report(Error('Recording encountered an error. Check the partial file.'));
   recorder.onstop=async()=>{clearInterval(timer);media.getTracks().forEach(t=>t.stop());wake?.release().catch(()=>{});if(mounted.current)setPhase('saving');try{await writer.close();if(mounted.current&&!failed)setMessage('Saved '+handle.name+'. Ready for the next session.');}catch(e){if(mounted.current)setMessage(e.message);}finally{active.current=null;locked.current=false;if(mounted.current){setPhase('idle');setHandle(null);}}};
   media.getTracks().forEach(t=>t.addEventListener('ended',stop,{once:true}));
   recorder.start(1000);setPhase('recording');
  }catch(e){media?.getTracks().forEach(t=>t.stop());try{await file?.abort();}catch{}wake?.release().catch(()=>{});active.current=null;if(mounted.current){setMessage(e.message);setPhase('idle');}}
  finally{if(!active.current)locked.current=false;}
 }
 return <section><h3>Personal video capture</h3><p>Save a permitted full session directly to your device. There is no 30-minute or 90 MB cutoff. Keep this tab open and the computer awake, with enough free disk space. Finish with Stop &amp; save; closing the tab before saving can lose the file.</p><p>Set 2× in the university player if available. The saved video retains that playback speed. Stop and save each session before opening the next; this recorder does not detect the lecture ending.</p><label>Session file name<input value={name} disabled={running||busy} onChange={e=>setName(e.target.value)} maxLength={180}/></label><button className="secondary" disabled={running||busy} onClick={choose}>Choose video save location</button>{handle&&<p>File: {handle.name}</p>}<label className="check"><input type="checkbox" checked={consent} disabled={running||busy} onChange={e=>setConsent(e.target.checked)}/>The university permits me to capture this recording.</label><button className="primary" disabled={!consent||!handle||running||busy} onClick={start}>Capture full session</button><button className="secondary" disabled={!running} onClick={stop}>Stop &amp; save video</button><p role="status">{running?`Recording · ${Math.floor(seconds/60)}m ${seconds%60}s · ${(bytes/1048576).toFixed(1)} MB`:busy?phase==='saving'?'Finishing video file…':'Starting capture…':message}</p><p>Videos stay on your device and are not uploaded to GitHub.</p></section>;
}
