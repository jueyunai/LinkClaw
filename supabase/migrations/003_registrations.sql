-- supabase/migrations/003_registrations.sql
-- 报名/邀请：定义活动与嘉宾之间的报名关系

create type registration_type as enum ('applied', 'invited');
create type registration_status as enum ('pending', 'accepted', 'rejected');

create table registrations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  guest_id uuid references profiles(id) on delete cascade not null,
  type registration_type not null,
  status registration_status not null default 'pending',
  ai_match_reason text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(event_id, guest_id)
);

create trigger registrations_updated_at
  before update on registrations
  for each row execute procedure update_updated_at();

create index idx_registrations_event on registrations(event_id);
create index idx_registrations_guest on registrations(guest_id);
