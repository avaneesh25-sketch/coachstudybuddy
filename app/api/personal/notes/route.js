import {sameOrigin,jsonBody,reply,failure} from '../../../../lib/http.js';
import {authorizePersonal,personalFailureMessage} from '../../../../lib/personal-ai.js';
import {generateNotes} from '../../../../lib/notes.js';
export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const body=await jsonBody(request,1000000);const {key,config}=await authorizePersonal(request,'notes');try{return reply(await generateNotes(body,key,undefined,config));}catch(e){throw personalFailureMessage(e);}}catch(e){return failure(e);}}
