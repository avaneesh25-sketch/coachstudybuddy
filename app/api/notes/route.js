import {sameOrigin,apiKey,jsonBody,reply,failure} from '../../../lib/http.js';import {generateNotes} from '../../../lib/notes.js';
export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const key=apiKey(request);return reply(await generateNotes(await jsonBody(request,250000),key))}catch(e){return failure(e)}}
