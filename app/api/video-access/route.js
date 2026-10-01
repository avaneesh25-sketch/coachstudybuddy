import {sameOrigin,reply,failure,InputError} from '../../../lib/http.js';
import {githubToken,videoIdentity} from '../../../lib/github-library.js';
export async function POST(request){try{sameOrigin(request);if(!await videoIdentity(githubToken(request)))throw new InputError('This account does not have video capture access.',403);return reply({allowed:true})}catch(e){return failure(e)}}
