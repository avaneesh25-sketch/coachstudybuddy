import {randomBytes,createHash} from 'node:crypto';
import {cookies} from 'next/headers.js';
import {sameOrigin,jsonBody,reply,failure,InputError} from '../../../../lib/http.js';
import {authRequest,requireUser,saveSession,universityUser} from '../../../../lib/managed-auth.js';
import {settings} from '../../../../lib/managed-store.js';
export async function GET(){try{settings();return reply({configured:true,user:await requireUser()});}catch(e){return reply({configured:e.status!==503,user:null,message:e.message});}}
export async function POST(request){try{
 sameOrigin(request);const {action}=await jsonBody(request,1000);const jar=await cookies();
 if(action==='logout'){jar.delete('csb-access');jar.delete('csb-refresh');return reply({ok:true});}
 if(action==='refresh'){const token=jar.get('csb-refresh')?.value;if(!token)throw new InputError('Sign in again.',401);const data=await authRequest('token?grant_type=refresh_token',{refresh_token:token});universityUser(data.user);await saveSession(data);return reply({user:data.user});}
 const site=process.env.SITE_URL;if(!site||new URL(site).origin!==new URL(request.url).origin)throw new InputError('The university sign-in redirect is not configured.',503);
 const verifier=randomBytes(32).toString('base64url');
 const data=await authRequest('sso',{domain:'mastersunion.org',redirect_to:site+'/api/study/callback',skip_http_redirect:true,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256'});
 if(!data.url||new URL(data.url).protocol!=='https:')throw new InputError('Invalid sign-in redirect.',502);
 jar.set('csb-verifier',verifier,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});return reply({url:data.url});
 }catch(e){return failure(e);}}
