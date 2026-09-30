import {sameOrigin,jsonBody,readLimited,reply,failure} from '../../../lib/http.js';
import {fetchDocument,extractDocument} from '../../../lib/materials.js';
export const runtime='nodejs';
export async function POST(request){try{sameOrigin(request);let bytes,name;if(request.headers.get('content-type')?.includes('application/json')){const input=await jsonBody(request,4000);bytes=await fetchDocument(input.url);name=input.name||'Course material'}else{bytes=await readLimited(request.body,(process.env.VERCEL?4:10)*1024*1024);name='Course material'}return reply(await extractDocument(bytes,name))}catch(e){return failure(e)}}
