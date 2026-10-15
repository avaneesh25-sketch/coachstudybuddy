import {sameOrigin,readLimited,reply,failure} from '../../../../lib/http.js';
import {authorizeAI} from '../../../../lib/managed-ai.js';
import {transcribe} from '../../../../lib/transcribe.js';
export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const bytes=await readLimited(request.body,4*1024*1024);const {key,config}=await authorizeAI(request,'transcribe');return reply(await transcribe(bytes,key,undefined,config));}catch(e){return failure(e);}}
