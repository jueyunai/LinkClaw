-- supabase/migrations/007_ai_pipeline_mvp.sql
-- 为 AI Pipeline MVP 补充画像缓存表，并扩展推荐缓存字段。

create table ai_profiles (
  id uuid default gen_random_uuid() primary key,
  source_type recommendation_target not null,
  source_id uuid not null,
  profile_json jsonb not null,
  model_id text not null,
  pipeline_version text,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (source_type, source_id)
);

create trigger ai_profiles_updated_at
  before update on ai_profiles
  for each row execute procedure update_updated_at();

alter table ai_recommendations
  add column mutual_interest boolean default false not null,
  add column guest_facing_reason text,
  add column organizer_facing_reason text,
  add column combined_reasons jsonb default '[]'::jsonb not null,
  add column risks jsonb default '[]'::jsonb not null,
  add column guest_evaluation jsonb,
  add column activity_evaluation jsonb,
  add column source text,
  add column pipeline_version text,
  add column updated_at timestamptz default now() not null;

create trigger ai_recommendations_updated_at
  before update on ai_recommendations
  for each row execute procedure update_updated_at();

create unique index idx_ai_recommendations_target_pair
  on ai_recommendations(target_type, target_id, recommended_id);

alter table ai_profiles enable row level security;

create policy "ai_profiles_service_select" on ai_profiles for select using (false);
create policy "ai_profiles_service_insert" on ai_profiles for insert with check (false);
create policy "ai_profiles_service_update" on ai_profiles for update using (false);
