-- Apply once through the Supabase SQL editor. No student-accessible write policies.
create table if not exists public.course_access (
 user_id uuid references auth.users(id) on delete cascade not null,
 term_course_id uuid not null,
 course_code text not null,
 term integer not null check(term between 0 and 20),
 subject_name text not null,
 active boolean not null default true,
 expires_at timestamptz not null,
 verified_by text not null check(length(verified_by)>0),
 primary key(user_id,term_course_id)
);
comment on table public.course_access is 'Populate only from the university-authorized enrolment integration. Never trust browser-entered course IDs as enrolment proof.';
create table if not exists public.session_summaries (
 id uuid primary key default gen_random_uuid(),
 term_course_id uuid not null,
 session_number integer not null check(session_number>0),
 title text not null,
 object_path text not null unique,
 created_by uuid references auth.users(id) not null,
 created_at timestamptz not null default now(),
 unique(term_course_id,session_number)
);
create table if not exists public.study_usage (
 user_id uuid not null,
 kind text not null check(kind in ('transcribe','notes')),
 day date not null,
 calls integer not null default 0,
 primary key(user_id,kind,day)
);
alter table public.course_access enable row level security;
alter table public.session_summaries enable row level security;
alter table public.study_usage enable row level security;
revoke all on public.course_access,public.session_summaries,public.study_usage from anon,authenticated;
grant all on public.course_access,public.session_summaries,public.study_usage to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('study-library','study-library',false,10485760,array['application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
create or replace function public.consume_study_allowance(p_user uuid,p_kind text)
returns boolean language plpgsql security definer set search_path=public as $$
declare used integer; daily_max integer; global_used integer; today date:=(now() at time zone 'utc')::date;
begin
 if p_kind not in ('transcribe','notes') then return false; end if;
 daily_max:=case when p_kind='transcribe' then 60 else 10 end;
 -- Serialize each day's allowance update across instances.
 perform pg_advisory_xact_lock(hashtext('coach-study-'||today::text));
 select coalesce(sum(calls),0) into global_used from study_usage where day=today and kind=p_kind;
 if global_used >= case when p_kind='transcribe' then 300 else 50 end then return false; end if;
 insert into study_usage(user_id,kind,day,calls) values(p_user,p_kind,today,1)
 on conflict(user_id,kind,day) do update set calls=study_usage.calls+1 where study_usage.calls<daily_max
 returning calls into used;
 return used is not null;
end; $$;
revoke all on function public.consume_study_allowance(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_study_allowance(uuid,text) to service_role;
