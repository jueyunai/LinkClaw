-- supabase/migrations/002_events.sql
-- 创建活动状态枚举，支持草稿、发布与关闭。
create type event_status as enum ('draft', 'published', 'closed');

-- 活动表，记录主办方发布的活动信息。
create table events (
  id uuid default gen_random_uuid() primary key,
  organizer_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  target_audience text,
  event_date timestamptz not null,
  location text not null,
  max_guests int not null default 50,
  status event_status not null default 'draft',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 复用前一个迁移中定义的 updated_at 自动更新时间函数。
create trigger events_updated_at
  before update on events
  for each row execute procedure update_updated_at();

-- 为常用查询条件建立索引。
create index idx_events_organizer on events(organizer_id);
create index idx_events_status on events(status);
create index idx_events_date on events(event_date);
