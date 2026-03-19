-- supabase/migrations/008_bounty_gamification.sql
-- 为悬赏大厅游戏化补充猎人段位与任务门槛字段。

alter table profiles
  add column hunter_level integer not null default 1;

alter table profiles
  add constraint profiles_hunter_level_check
  check (hunter_level >= 1 and hunter_level <= 6);

alter table events
  add column bounty_rank integer not null default 1;

alter table events
  add constraint events_bounty_rank_check
  check (bounty_rank >= 1 and bounty_rank <= 5);
