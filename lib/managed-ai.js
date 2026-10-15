import {InputError} from './http.js';
import {requireUser} from './managed-auth.js';
import {requireCourse,consume} from './managed-store.js';
export function managedProvider(kind,env=process.env){
 if(kind==='transcribe'){
  if(!env.GROQ_API_KEY)throw new InputError('Lecture transcription is not configured yet.',503);
  return {key:env.GROQ_API_KEY,config:{provider:'compatible',baseUrl:'https://api.groq.com/openai/v1',model:'unused',audioModel:'whisper-large-v3-turbo'}};
 }
 if(!env.GEMINI_API_KEY||!env.GEMINI_NOTES_MODEL)throw new InputError('Study-note generation is not configured yet.',503);
 return {key:env.GEMINI_API_KEY,config:{provider:'gemini',model:env.GEMINI_NOTES_MODEL}};
}
export async function authorizeAI(request,kind){
 const user=await requireUser();const identity=await requireCourse(user,{courseUrl:request.headers.get('x-course-url'),lectureId:request.headers.get('x-session-id')});
 const provider=managedProvider(kind);await consume(user,kind);return {...provider,user,identity};
}
