import {cookies} from 'next/headers.js';
import {authRequest,universityUser,saveSession} from '../../../../lib/managed-auth.js';
export async function GET(request){
 const base=new URL('/student',request.url);const jar=await cookies();
 try{const code=new URL(request.url).searchParams.get('code'),verifier=jar.get('csb-verifier')?.value;if(!code||!verifier)throw Error('Sign-in expired');
 const data=await authRequest('token?grant_type=pkce',{auth_code:code,code_verifier:verifier});universityUser(data.user);await saveSession(data);jar.delete('csb-verifier');
 }catch{jar.delete('csb-verifier');base.searchParams.set('signin','failed');}
 return Response.redirect(base,303);
}
