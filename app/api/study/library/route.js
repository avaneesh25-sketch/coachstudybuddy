import {randomUUID} from 'node:crypto';
import {sameOrigin,jsonBody,reply,failure,InputError} from '../../../../lib/http.js';
import {requireUser} from '../../../../lib/managed-auth.js';
import {database,requireCourse,findSummary,storage} from '../../../../lib/managed-store.js';
import {verifyAttestation} from '../../../../lib/study-attestation.js';
import {studyPdf} from '../../../../lib/study-pdf.js';
export const maxDuration=180;
export async function POST(request){try{
 sameOrigin(request);const user=await requireUser();const body=await jsonBody(request,1000000);
 if(body.action==='list'){
  const access=await database('course_access?user_id=eq.'+encodeURIComponent(user.id)+'&active=eq.true&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=term_course_id,course_code,term,subject_name');
  if(!access.length)return reply({courses:[],sessions:[]});
  const ids=access.map(a=>a.term_course_id).join(',');
  const sessions=await database('session_summaries?term_course_id=in.('+ids+')&select=id,term_course_id,session_number,title&order=session_number.asc');
  return reply({courses:access,sessions});
 }
 const identity=await requireCourse(user,body.lecture||body.pack?.lecture);
 const saved=await findSummary(identity);
 if(body.action==='lookup')return reply({summary:saved?{title:saved.title,createdAt:saved.created_at}:null});
 if(body.action==='download'){
  if(!saved)throw new InputError('No saved summary exists for this session.',404);
  const path=saved.object_path.split('/').map(encodeURIComponent).join('/');
  const r=await storage('object/study-library/'+path);
  return new Response(await r.arrayBuffer(),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="session-'+identity.session+'-summary.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(body.action!=='save')throw new InputError('Choose a library action.');
 if(saved)return reply({saved:true,existing:true,title:saved.title});
 const pack=body.pack;
 if(!pack?.transcript?.segments||!verifyAttestation(identity,pack))throw new InputError('Generate study notes in this workspace before saving a shared PDF.',403);
 const title=String(pack.lecture.title||'Session '+identity.session).slice(0,240);
 const normalized={...pack,lecture:{...pack.lecture,term:'Term '+identity.term,course:identity.code,subjectName:identity.subjectName,title}};
 const pdf=await studyPdf(normalized);
 const objectPath='term-'+identity.term+'/'+identity.courseId+'/session-'+identity.session+'/'+randomUUID()+'.pdf';
 await storage('object/study-library/'+objectPath,{method:'POST',headers:{'Content-Type':'application/pdf','x-upsert':'false'},body:pdf});
 try{
  const rows=await database('session_summaries?on_conflict=term_course_id,session_number',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:{term_course_id:identity.courseId,session_number:Number(identity.session),title,object_path:objectPath,created_by:user.id}});
  if(!rows.length){await storage('object/study-library',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[objectPath]})});return reply({saved:true,existing:true});}
 }catch(e){try{await storage('object/study-library',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[objectPath]})});}catch{}throw e;}
 return reply({saved:true,title});
 }catch(e){return failure(e);}}
