-- supabase/migrations/005_rls_policies.sql
-- RLS 策略：控制 profiles、events、registrations、ai_recommendations 的访问权限

-- 启用 RLS
alter table profiles enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table ai_recommendations enable row level security;

-- profiles：所有人可读，本人可更新
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- events：所有人可读已发布活动；主办方可管理自己的活动
create policy "events_select" on events for select using (
  status = 'published' or organizer_id = auth.uid()
);
create policy "events_insert" on events for insert with check (
  organizer_id = auth.uid()
);
create policy "events_update" on events for update using (
  organizer_id = auth.uid()
);
create policy "events_delete" on events for delete using (
  organizer_id = auth.uid()
);

-- registrations：嘉宾可查看/创建自己的报名；主办方可查看/管理自己活动的报名
create policy "registrations_select" on registrations for select using (
  guest_id = auth.uid() or
  event_id in (select id from events where organizer_id = auth.uid())
);
create policy "registrations_insert_guest" on registrations for insert with check (
  guest_id = auth.uid() and type = 'applied'
);
create policy "registrations_insert_organizer" on registrations for insert with check (
  type = 'invited' and
  event_id in (select id from events where organizer_id = auth.uid())
);
create policy "registrations_update" on registrations for update using (
  guest_id = auth.uid() or
  event_id in (select id from events where organizer_id = auth.uid())
);

-- ai_recommendations：推荐目标本人可读；主办方可读取推荐给自己活动的记录
create policy "recommendations_select" on ai_recommendations for select using (
  target_id = auth.uid() or
  recommended_id in (select id from events where organizer_id = auth.uid())
);
