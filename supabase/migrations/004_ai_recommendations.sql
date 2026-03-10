-- supabase/migrations/004_ai_recommendations.sql
-- AI 推荐缓存：存储推荐目标、推荐结果与过期时间

create type recommendation_target as enum ('guest', 'event');

create table ai_recommendations (
  id uuid default gen_random_uuid() primary key,
  target_type recommendation_target not null,
  target_id uuid not null,
  recommended_id uuid not null,
  match_score float not null,
  match_reason text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null
);

create index idx_recommendations_target on ai_recommendations(target_type, target_id);
create index idx_recommendations_expires on ai_recommendations(expires_at);
