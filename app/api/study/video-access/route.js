import {sameOrigin,reply,failure,InputError} from '../../../../lib/http.js';
import {requireUser} from '../../../../lib/managed-auth.js';
export async function POST(request){try{sameOrigin(request);const user=await requireUser();if(user.email.toLowerCase()!=='avaneesh.pramod2028@mastersunion.org')throw new InputError('Personal video access is not enabled for this account.',403);return reply({allowed:true});}catch(e){return failure(e);}}
