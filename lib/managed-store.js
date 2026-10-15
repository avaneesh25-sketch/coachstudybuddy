import {InputError} from './http.js';
export function settings(env=process.env){
 const url=env.SUPABASE_URL;
 if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!env.SUPABASE_SERVICE_ROLE_KEY||!env.SUPABASE_ANON_KEY)throw new InputError('Shared library setup is not complete yet.',503);
 return {url,key:env.SUPABASE_SERVICE_ROLE_KEY,anon:env.SUPABASE_ANON_KEY};
}
export async function database(path,{method='GET',body,headers={}}={},fetcher=fetch){
 const c=settings();const r=await fetcher(c.url+'/rest/v1/'+path,{method,headers:{apikey:c.key,Authorization:'Bearer '+c.key,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new InputError('The shared library could not complete this request. Please retry.',502);
 return r.status===204?null:r.json();
}
export function courseIdentity(input){
 let url;try{url=new URL(input.courseUrl)}catch{throw new InputError('Select a course from the university portal.')}
 const courseId=url.searchParams.get('termCourseId'),code=url.searchParams.get('courseCode');
 if(url.origin!=='https://coach.mastersunion.org'||url.pathname!=='/academics-detail'||!/^[0-9a-f-]{36}$/i.test(courseId||'')||!code||code.length>80)throw new InputError('Invalid course selection.');
 const session=String(input.lectureId||'');if(!/^[1-9]\d{0,3}$/.test(session))throw new InputError('Select a session.');
 return {courseId,code:code.toUpperCase(),session};
}
export async function requireCourse(user,input,fetcher){
 const identity=courseIdentity(input);
 const rows=await database('course_access?user_id=eq.'+encodeURIComponent(user.id)+'&term_course_id=eq.'+identity.courseId+'&active=eq.true&select=course_code,term,subject_name,expires_at',{ },fetcher);
 const access=rows[0];if(!access||access.course_code.toUpperCase()!==identity.code||!access.expires_at||Date.parse(access.expires_at)<=Date.now())throw new InputError('University course access has not been verified. Ask the administrator to connect the university enrolment feed.',403);
 return {...identity,term:access.term,subjectName:access.subject_name};
}
export function summaryQuery(identity){return 'term_course_id=eq.'+identity.courseId+'&session_number=eq.'+identity.session;}
export async function findSummary(identity,fetcher){const rows=await database('session_summaries?'+summaryQuery(identity)+'&select=id,title,object_path,created_at',{},fetcher);return rows[0]||null;}
export async function consume(user,kind,fetcher){
 const ok=await database('rpc/consume_study_allowance',{method:'POST',body:{p_user:user.id,p_kind:kind}},fetcher);
 if(ok!==true)throw new InputError('Your study-processing allowance is used for today. Saved summaries remain available.',429);
}
export async function storage(path,options={},fetcher=fetch){
 const c=settings();const r=await fetcher(c.url+'/storage/v1/'+path,{...options,headers:{apikey:c.key,Authorization:'Bearer '+c.key,...options.headers},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new InputError('The PDF could not be saved or downloaded from the library.',502);return r;
}
