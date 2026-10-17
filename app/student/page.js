'use client';
import {useEffect,useState} from 'react';
import Workflow from '../Workflow';
import PersonalWorkspace from '../PersonalWorkspace';
import VideoCapture from '../VideoCapture';
import {portalSessionRequest} from '../../lib/connector-client.js';
export default function StudentWorkspace(){
 const [user,setUser]=useState(null),[lecture,setLecture]=useState(null),[portalStatus,setPortalStatus]=useState('Checking connector…');
 useEffect(()=>{let active=true;fetch('/api/study/auth',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)setUser(d.user||null)}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{if(!user)return;const timer=setInterval(()=>fetch('/api/study/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'refresh'})}).catch(()=>{}),20*60*1000);return()=>clearInterval(timer)},[user]);
 useEffect(()=>{let active=true,checking=false,connected=false;
  async function check(){if(checking||connected)return;checking=true;try{const info=await portalSessionRequest('ping');if(!active)return;if(info?.version!=='0.16.0'){setPortalStatus('Install or update connector v0.16 to connect Coach. Audio and downloaded files can be used below now.');return;}const result=await portalSessionRequest('session-status');if(!active)return;if(result?.signedIn){connected=true;setPortalStatus('Coach course page detected. Use this open course below to select its session.');document.getElementById('transcript-workspace')?.scrollIntoView({behavior:'smooth'});}else setPortalStatus('Connector ready. Sign in to Coach and open Courses or a subject.');}catch{if(active)setPortalStatus('Connector not detected. Install it for portal imports, or use audio and files below.');}finally{checking=false}}
  check();const timer=setInterval(check,5000);window.addEventListener('focus',check);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',check)};
 },[]);
 const config={managed:true,personal:!user,provider:'gemini',model:'Gemini',audioModel:'whisper-large-v3-turbo',baseUrl:''};
 return <main style={{maxWidth:1100,margin:'auto',padding:32,width:'100%'}}>
  <a className="brand" href="/">◈ CoachStudyBuddy</a>
  <section className="hero"><div><h1>Your lecture,<br/><em>made clearer.</em></h1><p>Import a transcript or capture lecture audio, add the pre-reads, and download your study PDF. Whisper and Gemini are provided by this site; no student API key is needed. Daily and provider limits apply.</p></div></section>
  <section className="panel"><h2>Connect Coach or use your files</h2><div className="actions"><a className="primary" href="https://coach.mastersunion.org/courses" target="_blank" rel="noopener noreferrer">Open Coach login</a><a className="secondary" href="#audio-workspace">Add audio or record lecture</a><a className="secondary" href="/api/connector" download>Download connector v0.16 ZIP</a><a className="secondary" href="/connector" target="_blank" rel="noopener noreferrer">Installation &amp; connection check</a></div><p role="status">{portalStatus}</p><details><summary>First-time connector setup</summary><ol><li>Download and extract the connector ZIP.</li><li>In Chrome or Edge Extensions, enable Developer mode, choose Load unpacked, and select the extracted folder.</li><li>Open Coach in the same browser profile. When updating, reload the extension and this page after saving any audio.</li></ol></details></section>
  <section id="transcript-workspace"><h2>Lecture study workspace</h2><Workflow apiKey="managed-service" config={config} lecture={lecture} onLecture={setLecture}/></section>
  {user?.email?.toLowerCase()==='avaneesh.pramod2028@mastersunion.org'?<details className="panel"><summary>Personal workspace</summary><VideoCapture managed/></details>:<details className="panel"><summary>Personal workspace · account tools</summary><PersonalWorkspace/></details>}
 </main>;
}
