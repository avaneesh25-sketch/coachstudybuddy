import {checkProvider} from '../../../lib/provider.js';
import {sameOrigin,jsonBody,reply,failure} from '../../../lib/http.js';
export async function POST(request){try{sameOrigin(request);const {apiKey,...config}=await jsonBody(request,4096);const {status,...body}=await checkProvider(apiKey,undefined,config);return reply(body,status)}catch(e){return failure(e)}}
