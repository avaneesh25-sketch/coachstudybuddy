import {sameOrigin,jsonBody,reply,failure,InputError} from '../../../../lib/http.js';
import {authorizeAI} from '../../../../lib/managed-ai.js';
import {findSummary} from '../../../../lib/managed-store.js';
import {attest} from '../../../../lib/study-attestation.js';
import {generateNotes} from '../../../../lib/notes.js';
export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const body=await jsonBody(request,250000);const {key,config,identity}=await authorizeAI(request,'notes');if(await findSummary(identity))throw new InputError('This session already has a summary. Use Quick download.',409);const notes=await generateNotes(body,key,undefined,config);return reply({...notes,attestation:attest(identity,body.materials,body.segments,notes.sections)});}catch(e){return failure(e);}}
