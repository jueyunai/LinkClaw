-- supabase/migrations/001_profiles.sql
-- 创建用户角色枚举，区分嘉宾与主办方。
create type user_role as enum ('guest', 'organizer');

-- 用户画像表，与 Supabase Auth 用户一一对应。
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role user_role not null,
  display_name text not null,
  bio text,
  industry text,
  city text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 注册时自动创建 profile，优先使用元数据中的角色与显示名。
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'guest')::user_role,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 统一维护 updated_at 字段。
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();
