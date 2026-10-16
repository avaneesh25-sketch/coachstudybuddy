// UI navigation signal only. Never used as server authorization.
export function readPortalSession(){
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
 if(location.origin!=='https://coach.mastersunion.org')return {signedIn:false};
 if([...document.querySelectorAll('input[type="password"]')].some(visible))return {signedIn:false};
 const links=[...document.querySelectorAll('a[href]')].filter(visible).some(a=>{try{const u=new URL(a.href);return u.origin===location.origin&&u.pathname==='/academics-detail'&&!!u.searchParams.get('termCourseId')&&!!u.searchParams.get('courseCode')}catch{return false}});
 const sessions=location.pathname==='/academics-detail'&&[...document.querySelectorAll('p.name')].filter(visible).some(e=>/^Session\s+\d+\s*:/i.test(e.textContent.trim()));
 return {signedIn:links||sessions};
}
