import {sameOrigin,apiKey,readLimited,reply,failure} from '../../../lib/http.js';import {transcribe} from '../../../lib/transcribe.js';
export const runtime='nodejs';export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const key=apiKey(request);return reply(await transcribe(await readLimited(request.body,4*1024*1024),key))}catch(e){return failure(e)}}
