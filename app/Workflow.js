'use client';

import {useEffect,useRef,useState} from 'react';
import {buildStudyMaterial} from '../lib/build-study.js';
import PortalPicker from './PortalPicker';
import ManagedLibrary from './ManagedLibrary';
import {studyHeaders,libraryRequest} from '../lib/study-client.js';
import StudyLibrary from './StudyLibrary';
import LongAudioCapture from './LongAudioCapture';

const clock=n=>n===null||n===undefined?'Untimed':`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;

async function result(response){const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed.');return data}

function saveJson(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export default function Workflow({apiKey,lecture,config,onLecture}){

 const [hosted,setHosted]=useState(true);useEffect(()=>setHosted(!['localhost','127.0.0.1'].includes(window.location.hostname)),[]);const materialLimit=hosted?4:10;
 const [token,setToken]=useState(''),[imports,setImports]=useState([]),[materials,setMaterials]=useState([]),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[audio,setAudio]=useState(null),[heard,setHeard]=useState(false),[consent,setConsent]=useState(false),[transcript,setTranscript]=useState(null),[notes,setNotes]=useState(null);

 const [captureRequired,setCaptureRequired]=useState(false);
 const [libraryConnection,setLibraryConnection]=useState({token:'',repository:''}),[buildResult,setBuildResult]=useState(null),[pdfDownload,setPdfDownload]=useState(null),[libraryRevision,setLibraryRevision]=useState(0);
 useEffect(()=>()=>{if(pdfDownload)URL.revokeObjectURL(pdfDownload.url)},[pdfDownload]);
 const providerName=config.managed?'Google Gemini':config.provider==='gemini'?'Google Gemini':config.provider==='compatible'?config.baseUrl:'OpenAI';const providerHeaders=config.managed?studyHeaders(lecture):{'x-provider':config.provider,'x-base-url':config.baseUrl,'x-model':config.model,'x-audio-model':config.audioModel};

 const mounted=useRef(true),recorder=useRef(null),stream=useRef(null),timer=useRef(null),chunks=useRef([]),running=useRef(false),seen=useRef(new Set());

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearInterval(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop())}},[]);

 useEffect(()=>()=>{if(audio)URL.revokeObjectURL(audio.url)},[audio]);

 useEffect(()=>{if(!recording&&!audio&&!transcript&&!materials.length)return;const warn=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[recording,audio,transcript,materials]);

 useEffect(()=>{if(!token)return;let cancelled=false;const poll=async()=>{try{const data=await result(await fetch('/api/portal',{headers:{'x-pairing-code':token},cache:'no-store'}));if(!cancelled)setImports(data.imports)}catch(e){if(!cancelled){setMessage(e.message);setToken('')}}};poll();const id=setInterval(poll,4000);return()=>{cancelled=true;clearInterval(id)}},[token]);

 async function task(label,fn){if(running.current)return;running.current=true;setBusy(label);setMessage('');try{await fn()}catch(e){if(mounted.current)setMessage(e.message||'This step failed. Try again.')}finally{running.current=false;if(mounted.current)setBusy('')}}

 async function pairPortal(){await task('Connecting',async()=>{const data=await result(await fetch('/api/portal',{method:'POST'}));seen.current.clear();setImports([]);setToken(data.token)})}

 async function disconnectPortal(){await task('Disconnecting',async()=>{await result(await fetch('/api/portal',{method:'DELETE',headers:{'x-pairing-code':token}}));setToken('');setImports([])})}

 async function fetchMaterials(){await task('Fetching materials',async()=>{const links=[...new Map(imports.flatMap(x=>x.materials).map(m=>[m.url,m])).values()];if(!links.length)throw Error('No direct document links have been imported. Open a course document and use the connector on that tab.');for(const m of links){if(seen.current.has(m.url))continue;if(seen.current.size>=5)throw Error('This pilot supports five documents per lecture.');const data=await result(await fetch('/api/materials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)}));seen.current.add(m.url);setMaterials(old=>old.some(x=>x.id===data.id)?old:[...old,data]);setNotes(null)}})}

 async function upload(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;await task('Reading material',async()=>{if(materials.length>=5)throw Error('This pilot supports five documents.');if(file.size>materialLimit*1024*1024)throw Error(`Choose a document under ${materialLimit} MB.`);const data=await result(await fetch('/api/materials',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file}));data.name=file.name;setMaterials(old=>old.some(x=>x.id===data.id)?old:[...old,data]);setNotes(null)})}

 async function importTranscript(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;await task('Reading official transcript',async()=>{if(file.size>750000)throw Error('Choose a transcript under 750 KB.');const data=await result(await fetch('/api/transcript',{method:'POST',headers:{'Content-Type':'text/plain'},body:file}));setTranscript(data);setNotes(null);setMessage('Transcript ready. No audio transcription charge is needed.');})}
 async function compare(){await task('Comparing sources',async()=>{if(!apiKey)throw Error('Enter your API key under AI connection first.');const data=await result(await fetch(config.managed?'/api/study/notes':'/api/notes',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,...providerHeaders},body:JSON.stringify({materials,segments:transcript.segments})}));setNotes(data)})}


 async function savePrivateCopy(pack,connection){
 if(config.managed)return libraryRequest('save',pack.lecture,pack);
 return result(await fetch('/api/library',{method:'POST',headers:{'Content-Type':'application/json','x-github-token':connection.token},body:JSON.stringify({repository:connection.repository,pack})}));
 }
 async function buildAll(loadSources){
 if(running.current)return;
 if(!apiKey)throw Error('Connect your AI key before building study material.');
 const connection={...libraryConnection};
 const canArchive=config.managed||!!connection.token&&!!connection.repository;
 running.current=true;setBusy('Preparing study material');setMessage('');setBuildResult(null);setPdfDownload(null);
 try{
 if(canArchive&&!config.managed)await result(await fetch('/api/library',{method:'POST',headers:{'Content-Type':'application/json','x-github-token':connection.token},body:JSON.stringify({action:'browse',repository:connection.repository,path:''})}));
 const built=await buildStudyMaterial({
 loadSources:async()=>{const source=await loadSources();onLecture(source.lecture);setMaterials(source.materials);setTranscript(source.transcript);return source;},
 generateNotes:async source=>{const data=await result(await fetch('/api/notes',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,...(config.managed?studyHeaders(source.lecture):providerHeaders)},body:JSON.stringify({materials:source.materials,segments:source.transcript.segments})}));setNotes(data);return data;},
 renderPdf:async pack=>{const r=await fetch('/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pack)});if(!r.ok)await result(r);return r.blob();},
 offerDownload:async(pdf,pack)=>{const url=URL.createObjectURL(pdf),name='Session '+pack.lecture.lectureId+' - study summary.pdf';setPdfDownload({url,name});const a=document.createElement('a');a.href=url;a.download=name;a.click();},
 savePrivateCopy:pack=>canArchive?savePrivateCopy(pack,connection):Promise.reject(Error('Your PDF is available. Automatic shared-library saving is awaiting the site owner’s server connection.')),onProgress:setBusy
 });
 setBuildResult({...built,repository:connection.repository});setNotes(built.pack.notes);
 if(built.saved){setLibraryRevision(n=>n+1);setMessage('Your PDF is ready and a copy is saved in your private library.');}
 else setMessage('Your PDF is ready, but the private copy was not saved: '+built.saveError);
 }finally{running.current=false;setBusy('');}
 }
 async function retryPrivateSave(){await task('Saving private copy',async()=>{
 if(!buildResult?.pack)throw Error('Build a session first.');
 if(!config.managed&&libraryConnection.repository!==buildResult.repository)throw Error('Reconnect the original private repository before retrying.');
 const saved=await savePrivateCopy(buildResult.pack,libraryConnection);setBuildResult(old=>({...old,saved,saveError:null}));setLibraryRevision(n=>n+1);setMessage('Private copy saved. No additional AI request was made.');
 });}

 function citation(id){if(id.startsWith('t')){const s=transcript?.segments.find(s=>`t${s.id}`===id);return s?`Audio ${clock(s.start)}–${clock(s.end)}`:id}for(const m of materials){const p=m.pages.find(p=>`${m.id}:p${p.number}`===id);if(p)return `${m.name}, page/slide ${p.number}`}return id}

 return <section className="workflow">{captureRequired&&<div role="alert" className="panel"><h2>Lecture transcript required</h2><p>No official transcript could be imported. Capture the permitted lecture tab audio below, transcribe all parts, then click Build study material again. Notes cannot be generated until a transcript is available.</p></div>}<div className="panel noPrint"><h2>Need a saved session summary?</h2><p>Choose your term, subject and session in the private library. Download an existing PDF immediately, or follow the lecture workflow below when it has not been generated.</p><a className="primary" href="#study-library">Browse saved summaries</a></div><PortalPicker onCaptureActivity={setRecording} onRecordingRequired={()=>setCaptureRequired(true)} onBuild={buildAll} currentLecture={lecture} existingTranscript={transcript} apiKey={apiKey} config={config} onLecture={value=>{if(value?.courseUrl!==lecture?.courseUrl||value?.lectureId!==lecture?.lectureId){setTranscript(null);setNotes(null)}onLecture(value)}} onTranscript={value=>{setTranscript(value);setNotes(null)}} onMaterials={items=>{setMaterials(items);setNotes(null)}} disabled={!!busy||recording}/>{pdfDownload&&<div className="panel noPrint"><h2>Your study PDF</h2><a className="primary" href={pdfDownload.url} download={pdfDownload.name}>Download now</a><p>{buildResult?.saved?'Private copy saved.':busy||'PDF ready.'}</p>{buildResult?.saveError&&<><p role="alert">{buildResult.saveError}</p>{(config.managed||libraryConnection.repository)&&<button className="secondary" disabled={!!busy||recording} onClick={retryPrivateSave}>Retry private save</button>}</>}</div>}{materials.length>0&&<div className="panel noPrint"><h3>Imported lecture sources</h3>{materials.map(m=><details key={m.id}><summary>{m.name} · {m.pages.length} pages/slides</summary><p>{m.warnings.join(' ')}</p><pre>{m.pages.slice(0,3).map(p=>p.text).join('\n\n')}</pre></details>)}</div>}<details className="panel noPrint" open={captureRequired||undefined}><summary>Transcript and audio recovery options</summary><span className="eyebrow">02 · TRANSCRIPT FIRST</span><h2>Use the university transcript</h2><p className="subtle">Use the official Download Transcript option in the lecture player. If the browser connector cannot read that download automatically, choose the downloaded file here. No AI key is needed for this step.</p><label className="drop">Open downloaded transcript · TXT, VTT, SRT or JSON<input type="file" accept=".txt,.vtt,.srt,.json" disabled={!!busy||recording} onChange={importTranscript}/></label><LongAudioCapture key={(lecture?.courseUrl||'')+':'+(lecture?.lectureId||'')} apiKey={apiKey} config={{...config,lecture}} onActiveChange={setRecording} onTranscript={value=>{setTranscript(value);setNotes(null);setCaptureRequired(false)}}/>{transcript&&<div className="transcript"><h3>Timestamped transcript</h3><p className="subtle">{transcript.clock}</p><button className="secondary" onClick={()=>saveJson('lecture-transcript.json',transcript)}>Save transcript</button>{transcript.segments.map(s=><p key={s.id}><b>{clock(s.start)}–{clock(s.end)}</b> {s.text}</p>)}</div>}</details><details className="panel noPrint"><summary>Manual note generation</summary><span className="eyebrow">03 · COMBINE THE EVIDENCE</span><h2>Build your study notes</h2><p className="subtle">This sends extracted document text and the transcript to {providerName} ({config.model}). Provider token charges and quota apply; output limits depend on the adapter. Notes cover only the supplied transcript. Missing timestamps and incomplete coverage are disclosed. No automatic retries are charged.</p><div className="actions"><button className="primary" disabled={!!busy||recording||!transcript||!materials.length||!apiKey} onClick={compare}>Send sources & generate notes</button>{notes&&<><button className="secondary" onClick={()=>saveJson('study-pack.json',{lecture,notes,materials,transcript})}>Save study pack</button><button className="secondary" onClick={()=>window.print()}>Print / Save PDF</button></>}</div></details>{config.managed?<ManagedLibrary revision={libraryRevision} disabled={!!busy||recording}/>:<StudyLibrary onConnection={setLibraryConnection} externalRevision={libraryRevision} pack={{lecture,notes,materials,transcript}} disabled={!!busy||recording}/>}{(busy||message)&&<div className="feedback noPrint" role="status">{busy?`${busy}…`:message}</div>}{notes&&<article className="studyPack"><span className="eyebrow">COACHSTUDYBUDDY · SESSION STUDY PACK</span><h1>{lecture?.title||'Lecture study notes'}</h1><p>{lecture?.course||'Selected course'} · {transcript.origin==='official-file'?'Imported transcript':`Captured sample: ${clock(seconds)}`} · AI-generated; review against sources.</p>{notes.sections.map((s,i)=><section key={i}><span className="badge">{s.kind}</span><h2>{s.heading}</h2><p>{s.text}</p><small>{s.sources.map(citation).join(' · ')}</small></section>)}<h2>Coverage and limitations</h2><ul>{notes.limitations.map((s,i)=><li key={i}>{s}</li>)}</ul><p>Text extraction does not include visual interpretation of diagrams. Citations identify supplied evidence but do not guarantee an AI claim is correct.</p><h2>Transcript evidence</h2>{transcript.segments.map(s=><p key={s.id}><b>{clock(s.start)}–{clock(s.end)}</b> {s.text}</p>)}</article>}</section>

}

