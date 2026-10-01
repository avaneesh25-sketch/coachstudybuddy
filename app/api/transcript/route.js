import {sameOrigin,readLimited,reply,failure} from '../../../lib/http.js';
import {parseTranscript} from '../../../lib/transcript-file.js';
export async function POST(request){try{sameOrigin(request);return reply(parseTranscript((await readLimited(request.body,750000)).toString('utf8')))}catch(e){return failure(e)}}
