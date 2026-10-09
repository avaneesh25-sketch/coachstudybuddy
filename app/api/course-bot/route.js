import {sameOrigin,apiKey,jsonBody,reply,failure} from '../../../lib/http.js';
import {fromHeaders} from '../../../lib/providers.js';
import {planCourse} from '../../../lib/course-bot.js';
export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const key=apiKey(request);return reply(await planCourse(await jsonBody(request,2200000),key,fromHeaders(request)));}catch(e){return failure(e);}}
