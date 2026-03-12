-- supabase/migrations/006_user_auth_identities.sql
-- 本地账号与第三方身份映射表，为未来 OAuth2 登录接入做准备

create table user_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  provider_email text,
  linked_at timestamptz not null default timezone('utc', now())
);

create unique index user_auth_identities_provider_subject_idx
  on user_auth_identities (provider, provider_subject);

create unique index user_auth_identities_user_provider_idx
  on user_auth_identities (user_id, provider);

alter table user_auth_identities enable row level security;

create policy "user_auth_identities_select_own" on user_auth_identities
  for select using (auth.uid() = user_id);

create policy "user_auth_identities_insert_own" on user_auth_identities
  for insert with check (auth.uid() = user_id);

create policy "user_auth_identities_delete_own" on user_auth_identities
  for delete using (auth.uid() = user_id);
