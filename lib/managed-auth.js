import {cookies} from 'next/headers.js';
import {InputError} from './http.js';
import {settings} from './managed-store.js';
export async function authRequest(path,body,token,fetcher=fetch){
 const c=settings();const r=await fetcher(c.url+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{apikey:c.anon,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new InputError('University sign-in could not be verified. Sign in again or ask the administrator to finish SSO setup.',401);
 return r.json();
}
export function universityUser(user){
 const sso=user?.is_sso_user===true||user?.identities?.some(i=>String(i.provider).startsWith('sso:'));
 if(!user?.id||!user.email_confirmed_at||!String(user.email).toLowerCase().endsWith('@mastersunion.org')||!sso)throw new InputError('Sign in using the university SSO account.',403);
 return user;
}
export async function saveSession(data){
 if(!data.access_token||!data.refresh_token)throw new InputError('Sign-in returned no session.',401);
 const jar=await cookies();const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'};
 jar.set('csb-access',data.access_token,{...options,maxAge:Math.min(data.expires_in||3600,3600)});
 jar.set('csb-refresh',data.refresh_token,{...options,maxAge:7*24*3600});
}
export async function requireUser(){
 const jar=await cookies();const token=jar.get('csb-access')?.value;
 if(!token)throw new InputError('Sign in to your university account to continue.',401);
 return universityUser(await authRequest('user',undefined,token));
}
