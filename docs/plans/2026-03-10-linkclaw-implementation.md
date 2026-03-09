# LinkClaw MVP 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 构建 LinkClaw 双边平台 MVP — 连接活动主办方和嘉宾，含用户认证、画像管理、活动发布、报名/邀请、AI 推荐（先 Mock）。

**架构:** Next.js 15 App Router 全栈应用，Supabase 提供数据库 + 认证，next-intl 实现中英文切换。所有页面在 `app/[locale]/` 下。Middleware 同时处理 i18n 路由和 Supabase session 刷新。

**技术栈:**
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (PostgreSQL + Auth)
- next-intl (i18n)
- Vitest + Testing Library
- pnpm

---

## 前置准备（用户手动操作）

在开始实现前，需要完成以下操作：

### 1. 创建 Supabase 项目
- 前往 https://supabase.com 创建新项目
- 记录以下信息（Settings → API）：
  - `Project URL` → 用于 `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public key` → 用于 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. 配置 Supabase Auth
- 在 Authentication → Providers 中确认 Email 已启用
- 在 Authentication → URL Configuration 中设置：
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. 安装 Supabase CLI（用于数据库迁移）
```bash
brew install supabase/tap/supabase
# 或
pnpm add -g supabase
```

### 4. 初始化 Git 仓库
```bash
cd LinkClaw
git init
```

---

## Phase 0: 项目脚手架

### Task 0.1: 初始化 Next.js 项目

**文件:** 项目根目录

**Step 1: 创建 Next.js 项目**

```bash
cd /Users/zhiyun.lee/GitHub/builder/LinkClaw
pnpm create next-app . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

选项说明：TypeScript + Tailwind + ESLint + App Router + src 目录 + `@/*` 路径别名

**Step 2: 验证项目启动**

```bash
pnpm dev
```

访问 `http://localhost:3000`，确认看到 Next.js 默认页面。`Ctrl+C` 停止。

**Step 3: 提交**

```bash
git add .
git commit -m "init: next.js 15 项目脚手架"
```

---

### Task 0.2: 配置 shadcn/ui

**文件:**
- 创建: `components.json`
- 修改: `src/app/globals.css`

**Step 1: 初始化 shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

**Step 2: 安装基础组件**

```bash
pnpm dlx shadcn@latest add button card input label textarea select badge separator avatar dropdown-menu dialog tabs toast form
```

**Step 3: 验证组件安装**

确认 `src/components/ui/` 目录下有对应组件文件。

**Step 4: 提交**

```bash
git add .
git commit -m "init: 配置 shadcn/ui 及基础组件"
```

---

### Task 0.3: 配置 next-intl 国际化

**文件:**
- 创建: `src/i18n/routing.ts`
- 创建: `src/i18n/request.ts`
- 创建: `src/i18n/navigation.ts`
- 创建: `messages/en.json`
- 创建: `messages/zh.json`
- 修改: `next.config.ts`
- 修改: `src/middleware.ts`
- 修改: `src/app/layout.tsx` → 移至 `src/app/[locale]/layout.tsx`
- 修改: `src/app/page.tsx` → 移至 `src/app/[locale]/page.tsx`

**Step 1: 安装 next-intl**

```bash
pnpm add next-intl
```

**Step 2: 创建路由配置**

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
});
```

**Step 3: 创建请求配置**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**Step 4: 创建导航工具**

```typescript
// src/i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

**Step 5: 创建翻译文件**

```json
// messages/zh.json
{
  "common": {
    "appName": "LinkClaw",
    "tagline": "AI 活动智能匹配平台",
    "login": "登录",
    "register": "注册",
    "logout": "退出登录",
    "save": "保存",
    "cancel": "取消",
    "submit": "提交",
    "loading": "加载中...",
    "guest": "嘉宾",
    "organizer": "主办方"
  },
  "home": {
    "title": "发现最适合你的活动",
    "subtitle": "AI 智能匹配，连接活动与嘉宾"
  },
  "auth": {
    "loginTitle": "登录 LinkClaw",
    "registerTitle": "注册 LinkClaw",
    "email": "邮箱",
    "password": "密码",
    "confirmPassword": "确认密码",
    "selectRole": "选择你的角色",
    "guestDesc": "发现并参加感兴趣的活动",
    "organizerDesc": "发布活动并找到理想嘉宾",
    "noAccount": "还没有账号？",
    "hasAccount": "已有账号？",
    "loginAction": "立即登录",
    "registerAction": "立即注册"
  },
  "profile": {
    "title": "个人画像",
    "displayName": "显示名称",
    "bio": "自我介绍",
    "bioPlaceholder": "用自然语言描述你的背景、行业经验和兴趣方向...",
    "industry": "所在行业",
    "city": "所在城市",
    "saveSuccess": "画像已保存"
  },
  "events": {
    "title": "活动列表",
    "create": "发布活动",
    "eventTitle": "活动标题",
    "description": "活动描述",
    "targetAudience": "目标嘉宾画像",
    "targetAudiencePlaceholder": "描述你理想的参会嘉宾...",
    "eventDate": "活动时间",
    "location": "活动地点",
    "maxGuests": "人数上限",
    "status": "状态",
    "draft": "草稿",
    "published": "已发布",
    "closed": "已结束",
    "apply": "报名参加",
    "applied": "已报名",
    "full": "已满员",
    "manage": "管理活动"
  },
  "recommendation": {
    "title": "AI 为你推荐",
    "reason": "推荐理由",
    "matchScore": "匹配度",
    "unavailable": "AI 推荐暂时不可用",
    "refresh": "刷新推荐",
    "recommendedGuests": "推荐嘉宾"
  },
  "myEvents": {
    "title": "我的活动",
    "registered": "已报名",
    "published": "已发布",
    "invited": "收到邀请",
    "pending": "待处理",
    "accepted": "已接受",
    "rejected": "已拒绝"
  }
}
```

```json
// messages/en.json
{
  "common": {
    "appName": "LinkClaw",
    "tagline": "AI Event Matching Platform",
    "login": "Login",
    "register": "Sign Up",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit",
    "loading": "Loading...",
    "guest": "Guest",
    "organizer": "Organizer"
  },
  "home": {
    "title": "Discover Events Made for You",
    "subtitle": "AI-powered matching between events and guests"
  },
  "auth": {
    "loginTitle": "Login to LinkClaw",
    "registerTitle": "Sign Up for LinkClaw",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "selectRole": "Choose Your Role",
    "guestDesc": "Discover and attend events that match your interests",
    "organizerDesc": "Host events and find the perfect guests",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "loginAction": "Login Now",
    "registerAction": "Sign Up Now"
  },
  "profile": {
    "title": "Profile",
    "displayName": "Display Name",
    "bio": "About You",
    "bioPlaceholder": "Describe your background, industry experience, and interests...",
    "industry": "Industry",
    "city": "City",
    "saveSuccess": "Profile saved"
  },
  "events": {
    "title": "Events",
    "create": "Create Event",
    "eventTitle": "Event Title",
    "description": "Description",
    "targetAudience": "Target Audience",
    "targetAudiencePlaceholder": "Describe your ideal attendees...",
    "eventDate": "Date",
    "location": "Location",
    "maxGuests": "Max Guests",
    "status": "Status",
    "draft": "Draft",
    "published": "Published",
    "closed": "Closed",
    "apply": "Register",
    "applied": "Registered",
    "full": "Full",
    "manage": "Manage"
  },
  "recommendation": {
    "title": "AI Recommendations",
    "reason": "Why this match",
    "matchScore": "Match Score",
    "unavailable": "AI recommendations temporarily unavailable",
    "refresh": "Refresh",
    "recommendedGuests": "Recommended Guests"
  },
  "myEvents": {
    "title": "My Events",
    "registered": "Registered",
    "published": "Published",
    "invited": "Invitations",
    "pending": "Pending",
    "accepted": "Accepted",
    "rejected": "Rejected"
  }
}
```

**Step 6: 修改 next.config.ts**

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {};

export default withNextIntl(nextConfig);
```

**Step 7: 创建 middleware.ts（仅 i18n，Supabase 在 Phase 2 加入）**

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

**Step 8: 重构 layout 到 [locale] 目录**

将 `src/app/layout.tsx` → `src/app/[locale]/layout.tsx`，将 `src/app/page.tsx` → `src/app/[locale]/page.tsx`。

```typescript
// src/app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

export const metadata: Metadata = {
  title: 'LinkClaw - AI 活动智能匹配平台',
  description: 'AI-powered event matching platform',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

```typescript
// src/app/[locale]/page.tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('home');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
    </main>
  );
}
```

注意：`globals.css` 保留在 `src/app/` 下（不在 `[locale]` 内），layout 中通过相对路径 `../globals.css` 引入。

**Step 9: 验证**

```bash
pnpm dev
```

访问 `http://localhost:3000` → 应自动重定向到 `/zh`。访问 `/en` 应显示英文版。

**Step 10: 提交**

```bash
git add .
git commit -m "feat: 配置 next-intl 中英文国际化"
```

---

### Task 0.4: 配置 Vitest

**文件:**
- 创建: `vitest.config.ts`
- 创建: `test/setup.ts`
- 创建: `test/example.test.ts`
- 修改: `package.json`（添加 scripts）

**Step 1: 安装依赖**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 2: 创建 vitest 配置**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: 创建 setup 文件**

```typescript
// test/setup.ts
import '@testing-library/jest-dom/vitest';
```

**Step 4: 创建示例测试，验证配置正确**

```typescript
// test/example.test.ts
import { describe, it, expect } from 'vitest';

describe('vitest 配置验证', () => {
  it('基础断言正常工作', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 5: 添加 npm scripts**

在 `package.json` 中添加：

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 6: 运行测试**

```bash
pnpm test:run
```

预期输出：1 test passed。

**Step 7: 提交**

```bash
git add .
git commit -m "init: 配置 vitest 测试框架"
```

---

### Task 0.5: 创建项目目录结构

**文件:** 创建空目录和占位文件

**Step 1: 创建目录结构**

```bash
mkdir -p src/lib/supabase
mkdir -p src/components/layout
mkdir -p src/components/features
mkdir -p src/types
```

**Step 2: 创建类型定义文件**

```typescript
// src/types/database.ts
// Supabase 数据库类型（后续由 supabase gen types 生成，这里先手写核心类型）

export type UserRole = 'guest' | 'organizer';
export type EventStatus = 'draft' | 'published' | 'closed';
export type RegistrationType = 'applied' | 'invited';
export type RegistrationStatus = 'pending' | 'accepted' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  target_audience: string | null;
  event_date: string;
  location: string;
  max_guests: number;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  guest_id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  ai_match_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiRecommendation {
  id: string;
  target_type: 'guest' | 'event';
  target_id: string;
  recommended_id: string;
  match_score: number;
  match_reason: string;
  expires_at: string;
  created_at: string;
}
```

**Step 3: 提交**

```bash
git add .
git commit -m "init: 创建项目目录结构和类型定义"
```

---

## Phase 1: Supabase 数据库

### Task 1.1: 配置 Supabase 客户端

**文件:**
- 创建: `src/lib/supabase/client.ts`
- 创建: `src/lib/supabase/server.ts`
- 创建: `src/lib/supabase/middleware.ts`
- 创建: `.env.local`（不提交到 Git）
- 修改: `.gitignore`

**Step 1: 安装 Supabase 依赖**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**Step 2: 创建环境变量文件**

```bash
# .env.local（不提交 Git）
NEXT_PUBLIC_SUPABASE_URL=你的_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_ANON_KEY
```

确认 `.gitignore` 已包含 `.env.local`。

**Step 3: 创建浏览器端客户端**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 4: 创建服务端客户端**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 中调用 setAll 会抛错，可安全忽略
          }
        },
      },
    }
  );
}
```

**Step 5: 创建 middleware 工具函数**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 刷新过期 token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse: response };
}
```

**Step 6: 提交**

```bash
git add .
git commit -m "feat: 配置 Supabase 客户端（浏览器 + 服务端 + middleware）"
```

---

### Task 1.2: 创建数据库迁移

**文件:**
- 创建: `supabase/migrations/001_profiles.sql`
- 创建: `supabase/migrations/002_events.sql`
- 创建: `supabase/migrations/003_registrations.sql`
- 创建: `supabase/migrations/004_ai_recommendations.sql`
- 创建: `supabase/migrations/005_rls_policies.sql`

**Step 1: 初始化 Supabase 本地项目**

```bash
npx supabase init
```

**Step 2: 创建 profiles 迁移**

```sql
-- supabase/migrations/001_profiles.sql
create type user_role as enum ('guest', 'organizer');

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

-- 注册时自动创建 profile 的触发器
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

-- updated_at 自动更新触发器
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
```

**Step 3: 创建 events 迁移**

```sql
-- supabase/migrations/002_events.sql
create type event_status as enum ('draft', 'published', 'closed');

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

create trigger events_updated_at
  before update on events
  for each row execute procedure update_updated_at();

create index idx_events_organizer on events(organizer_id);
create index idx_events_status on events(status);
create index idx_events_date on events(event_date);
```

**Step 4: 创建 registrations 迁移**

```sql
-- supabase/migrations/003_registrations.sql
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
```

**Step 5: 创建 ai_recommendations 迁移**

```sql
-- supabase/migrations/004_ai_recommendations.sql
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
```

**Step 6: 创建 RLS 策略**

```sql
-- supabase/migrations/005_rls_policies.sql

-- 启用 RLS
alter table profiles enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table ai_recommendations enable row level security;

-- profiles: 所有人可读，本人可改
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- events: 所有人可读 published，主办方可 CRUD 自己的
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

-- registrations: 嘉宾可看/创建自己的，主办方可看/管理自己活动的
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

-- ai_recommendations: 推荐对象本人可读
create policy "recommendations_select" on ai_recommendations for select using (
  target_id = auth.uid() or
  recommended_id in (select id from events where organizer_id = auth.uid())
);
```

**Step 7: 推送迁移到 Supabase**

```bash
npx supabase db push
```

或者：手动在 Supabase SQL Editor 中按顺序执行这 5 个文件。

**Step 8: 提交**

```bash
git add .
git commit -m "feat: 创建数据库迁移（profiles, events, registrations, ai_recommendations + RLS）"
```

---

## Phase 2: 认证系统

### Task 2.1: 整合 Middleware（i18n + Supabase Auth）

**文件:**
- 修改: `src/middleware.ts`

**Step 1: 更新 middleware 整合 i18n 和 auth**

```typescript
// src/middleware.ts
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

// 需要登录才能访问的路径（不含 locale 前缀）
const protectedPaths = ['/profile', '/events/new', '/my-events'];

// 已登录用户不应访问的路径
const authPaths = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  // 1. 先运行 i18n middleware（处理 locale 重定向）
  const intlResponse = intlMiddleware(request);

  // 2. 再刷新 Supabase session
  const { user } = await updateSession(request, intlResponse);

  // 3. 路由保护：提取不含 locale 的路径
  const pathname = request.nextUrl.pathname;
  const pathnameWithoutLocale = pathname.replace(/^\/(zh|en)/, '') || '/';

  if (
    protectedPaths.some((p) => pathnameWithoutLocale.startsWith(p)) &&
    !user
  ) {
    const locale = pathname.startsWith('/en') ? 'en' : 'zh';
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    authPaths.some((p) => pathnameWithoutLocale.startsWith(p)) &&
    user
  ) {
    const locale = pathname.startsWith('/en') ? 'en' : 'zh';
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

**Step 2: 验证 middleware 编译无误**

```bash
pnpm build
```

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 整合 i18n + Supabase auth middleware"
```

---

### Task 2.2: Auth 回调处理

**文件:**
- 创建: `src/app/[locale]/auth/callback/route.ts`

**Step 1: 创建 Auth 回调 Route Handler**

Supabase 邮箱确认后会重定向到此 endpoint。

```typescript
// src/app/[locale]/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
```

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加 Supabase auth 回调处理"
```

---

### Task 2.3: Auth Server Actions

**文件:**
- 创建: `src/app/[locale]/auth/actions.ts`

**Step 1: 创建认证 Server Actions**

```typescript
// src/app/[locale]/auth/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLocale } from 'next-intl/server';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    redirect(`/${locale}/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}`);
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        role: formData.get('role') as string,
        display_name: formData.get('displayName') as string,
      },
    },
  });

  if (error) {
    redirect(
      `/${locale}/auth/register?error=${encodeURIComponent(error.message)}`
    );
  }

  // 注册成功后引导到画像页
  redirect(`/${locale}/profile`);
}

export async function logout() {
  const supabase = await createClient();
  const locale = await getLocale();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
```

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加认证 server actions（登录/注册/退出）"
```

---

### Task 2.4: 登录页面

**文件:**
- 创建: `src/app/[locale]/auth/login/page.tsx`

**Step 1: 创建登录页**

```tsx
// src/app/[locale]/auth/login/page.tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;

  return <LoginForm error={error} />;
}

function LoginForm({ error }: { error?: string }) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('loginTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              {t('loginAction')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/auth/register" className="text-primary underline">
              {t('registerAction')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加登录页面"
```

---

### Task 2.5: 注册页面（含角色选择）

**文件:**
- 创建: `src/app/[locale]/auth/register/page.tsx`

**Step 1: 创建注册页**

```tsx
// src/app/[locale]/auth/register/page.tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { register } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;

  return <RegisterForm error={error} />;
}

function RegisterForm({ error }: { error?: string }) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('registerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <form action={register} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{tc('appName')}</Label>
              <Input id="displayName" name="displayName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <div className="space-y-3">
              <Label>{t('selectRole')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="guest"
                    defaultChecked
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border-2 border-muted p-4 text-center peer-checked:border-primary peer-checked:bg-primary/5">
                    <p className="font-medium">{tc('guest')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('guestDesc')}
                    </p>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="organizer"
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border-2 border-muted p-4 text-center peer-checked:border-primary peer-checked:bg-primary/5">
                    <p className="font-medium">{tc('organizer')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('organizerDesc')}
                    </p>
                  </div>
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full">
              {t('registerAction')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/auth/login" className="text-primary underline">
              {t('loginAction')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Step 2: 验证登录/注册流程**

```bash
pnpm dev
```

访问 `/zh/auth/register`，注册新用户，检查 Supabase Dashboard 是否出现新用户和 profile 记录。

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 添加注册页面（含角色选择）"
```

---

### Task 2.6: 全局导航栏（含 Auth 状态 + 语言切换）

**文件:**
- 创建: `src/components/layout/navbar.tsx`
- 创建: `src/components/layout/locale-switcher.tsx`
- 修改: `src/app/[locale]/layout.tsx`

**Step 1: 创建语言切换组件**

```tsx
// src/components/layout/locale-switcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const nextLocale = locale === 'zh' ? 'en' : 'zh';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Button variant="ghost" size="sm" onClick={switchLocale}>
      {locale === 'zh' ? 'EN' : '中文'}
    </Button>
  );
}
```

**Step 2: 创建导航栏**

```tsx
// src/components/layout/navbar.tsx
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from './locale-switcher';
import { logout } from '@/app/[locale]/auth/actions';

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return <NavbarContent user={user} profile={profile} />;
}

function NavbarContent({
  user,
  profile,
}: {
  user: any;
  profile: { role: string; display_name: string } | null;
}) {
  const t = useTranslations('common');

  return (
    <header className="border-b">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          {t('appName')}
        </Link>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {user && profile ? (
            <>
              <Link href="/my-events">
                <Button variant="ghost" size="sm">
                  {profile.display_name}
                </Button>
              </Link>
              {profile.role === 'organizer' && (
                <Link href="/events/new">
                  <Button size="sm">+</Button>
                </Link>
              )}
              <form action={logout}>
                <Button variant="ghost" size="sm" type="submit">
                  {t('logout')}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">{t('register')}</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
```

**Step 3: 在 layout 中引入 Navbar**

在 `src/app/[locale]/layout.tsx` 的 `<body>` 中添加 `<Navbar />`。

**Step 4: 提交**

```bash
git add .
git commit -m "feat: 添加全局导航栏（auth 状态 + 语言切换）"
```

---

## Phase 3: 用户画像

### Task 3.1: 画像编辑页面

**文件:**
- 创建: `src/app/[locale]/profile/page.tsx`
- 创建: `src/app/[locale]/profile/actions.ts`

**Step 1: 创建 Server Action**

```typescript
// src/app/[locale]/profile/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: formData.get('displayName') as string,
      bio: formData.get('bio') as string,
      industry: formData.get('industry') as string,
      city: formData.get('city') as string,
    })
    .eq('id', user.id);

  if (error) {
    redirect(`/${locale}/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/profile?success=true`);
}
```

**Step 2: 创建画像页面**

页面功能：
- 从 Supabase 读取当前用户 profile
- 表单：display_name, bio (textarea), industry, city
- bio 字段是 AI 匹配的核心输入，需要较大的 textarea 并给出提示
- 保存后显示成功提示

使用 Server Component 获取数据 + Client Component 渲染表单。shadcn/ui 的 Input, Textarea, Label, Button, Card 组件。

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 添加画像编辑页面"
```

---

## Phase 4: 活动管理

### Task 4.1: 发布活动页面（主办方）

**文件:**
- 创建: `src/app/[locale]/events/new/page.tsx`
- 创建: `src/app/[locale]/events/actions.ts`

**Step 1: 创建 Events Server Actions**

```typescript
// src/app/[locale]/events/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data, error } = await supabase
    .from('events')
    .insert({
      organizer_id: user.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      target_audience: formData.get('targetAudience') as string,
      event_date: formData.get('eventDate') as string,
      location: formData.get('location') as string,
      max_guests: parseInt(formData.get('maxGuests') as string),
      status: (formData.get('status') as string) || 'draft',
    })
    .select('id')
    .single();

  if (error) {
    redirect(`/${locale}/events/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/events/${data.id}`);
}

export async function updateEventStatus(eventId: string, status: string) {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) {
    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/events/${eventId}/manage`);
}
```

**Step 2: 创建发布活动页面**

表单字段：title, description (textarea), target_audience (textarea), event_date (datetime), location, max_guests (number), status (draft/published select)。

保存后跳转到活动详情页。

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 添加活动发布页面（主办方）"
```

---

### Task 4.2: 活动列表页面

**文件:**
- 创建: `src/components/features/event-card.tsx`
- 修改: `src/app/[locale]/page.tsx`

**Step 1: 创建活动卡片组件**

EventCard 组件展示：title, description (truncated), event_date, location, max_guests, status badge。

**Step 2: 修改首页为活动列表**

从 Supabase 查询 `events` 表（status = 'published'），按 event_date 排序，展示 EventCard 列表。

嘉宾看到的是 AI 推荐排序的活动列表（Phase 6 实现，此阶段先按时间排序）。

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 添加活动列表页（首页）"
```

---

### Task 4.3: 活动详情页

**文件:**
- 创建: `src/app/[locale]/events/[id]/page.tsx`

**Step 1: 创建活动详情页**

从 Supabase 根据 `id` 查询活动详情，同时 JOIN 查询主办方 profile 信息。

页面内容：
- 活动标题、描述、时间、地点、人数上限
- 主办方信息
- 报名按钮（嘉宾可见，Phase 5 实现功能）
- 管理入口（仅主办方可见）

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加活动详情页"
```

---

### Task 4.4: 活动管理页（主办方）

**文件:**
- 创建: `src/app/[locale]/events/[id]/manage/page.tsx`

**Step 1: 创建管理页面**

功能：
- 活动基本信息概览
- 状态切换（draft → published → closed）
- 报名列表（已报名的嘉宾，带 accept/reject 操作）— Phase 5 实现 UI
- AI 推荐嘉宾列表 — Phase 6 实现
- Tabs 组件切换不同面板

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加活动管理页面（主办方）"
```

---

## Phase 5: 报名 / 邀请

### Task 5.1: 嘉宾报名功能

**文件:**
- 创建: `src/app/[locale]/events/[id]/registration-actions.ts`
- 修改: `src/app/[locale]/events/[id]/page.tsx`（添加报名按钮逻辑）

**Step 1: 创建报名 Server Action**

```typescript
// src/app/[locale]/events/[id]/registration-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

export async function applyToEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase.from('registrations').insert({
    event_id: eventId,
    guest_id: user.id,
    type: 'applied',
    status: 'pending',
  });

  if (error) throw new Error(error.message);

  const locale = await getLocale();
  revalidatePath(`/${locale}/events/${eventId}`);
}

export async function inviteGuest(eventId: string, guestId: string, reason?: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('registrations').insert({
    event_id: eventId,
    guest_id: guestId,
    type: 'invited',
    status: 'pending',
    ai_match_reason: reason,
  });

  if (error) throw new Error(error.message);

  const locale = await getLocale();
  revalidatePath(`/${locale}/events/${eventId}/manage`);
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: 'accepted' | 'rejected',
  eventId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', registrationId);

  if (error) throw new Error(error.message);

  const locale = await getLocale();
  revalidatePath(`/${locale}/events/${eventId}/manage`);
}
```

**Step 2: 在活动详情页添加报名按钮**

查询当前用户是否已报名，显示不同状态：
- 未报名 → 显示"报名参加"按钮
- 已报名 pending → 显示"已报名，等待确认"
- accepted → 显示"已确认参加"
- rejected → 显示"报名未通过"
- 活动已满 → 显示"已满员"

**Step 3: 在管理页面添加报名列表**

展示所有报名记录，带 accept / reject 按钮。JOIN profiles 表获取嘉宾信息。

**Step 4: 提交**

```bash
git add .
git commit -m "feat: 添加报名/邀请功能"
```

---

### Task 5.2: 嘉宾响应邀请

**文件:**
- 修改: `src/app/[locale]/my-events/page.tsx`（在 Task 7 创建，此处描述逻辑）

嘉宾在"我的活动"页面可以看到收到的邀请，点击"接受"或"拒绝"。

复用 `updateRegistrationStatus` action，嘉宾只能操作自己的 `invited` 类型记录。

---

## Phase 6: AI 推荐（Mock 实现）

### Task 6.1: Mock AI 推荐服务

**文件:**
- 创建: `src/lib/ai/recommendation.ts`
- 创建: `test/lib/ai/recommendation.test.ts`

**Step 1: 编写测试**

```typescript
// test/lib/ai/recommendation.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  getRecommendedEventsForGuest,
  getRecommendedGuestsForEvent,
} from '@/lib/ai/recommendation';

// Mock Supabase — 具体 mock 实现根据接口设计
describe('AI 推荐服务（Mock）', () => {
  it('为嘉宾返回推荐活动列表', async () => {
    const result = await getRecommendedEventsForGuest('test-guest-id');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => {
      expect(item).toHaveProperty('event_id');
      expect(item).toHaveProperty('match_score');
      expect(item).toHaveProperty('match_reason');
    });
  });

  it('为活动返回推荐嘉宾列表', async () => {
    const result = await getRecommendedGuestsForEvent('test-event-id');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => {
      expect(item).toHaveProperty('guest_id');
      expect(item).toHaveProperty('match_score');
      expect(item).toHaveProperty('match_reason');
    });
  });
});
```

**Step 2: 实现 Mock 推荐服务**

```typescript
// src/lib/ai/recommendation.ts
import { createClient } from '@/lib/supabase/server';

interface EventRecommendation {
  event_id: string;
  match_score: number;
  match_reason: string;
}

interface GuestRecommendation {
  guest_id: string;
  match_score: number;
  match_reason: string;
}

/**
 * Mock: 为嘉宾推荐活动
 * 当前逻辑：按 industry + city 匹配度排序
 * TODO: 接入 Claude API 实现语义匹配
 */
export async function getRecommendedEventsForGuest(
  guestId: string
): Promise<EventRecommendation[]> {
  const supabase = await createClient();

  // 获取嘉宾画像
  const { data: profile } = await supabase
    .from('profiles')
    .select('bio, industry, city')
    .eq('id', guestId)
    .single();

  if (!profile) return [];

  // 获取已发布的活动
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, target_audience, location')
    .eq('status', 'published')
    .order('event_date', { ascending: true })
    .limit(10);

  if (!events) return [];

  // Mock 匹配逻辑：简单关键词匹配
  return events.map((event) => {
    let score = 0.5; // 基础分
    const reason: string[] = [];

    if (
      profile.city &&
      event.location?.toLowerCase().includes(profile.city.toLowerCase())
    ) {
      score += 0.2;
      reason.push(`活动在你所在的城市${profile.city}`);
    }

    if (
      profile.industry &&
      (event.description?.includes(profile.industry) ||
        event.target_audience?.includes(profile.industry))
    ) {
      score += 0.2;
      reason.push(`活动面向${profile.industry}行业`);
    }

    return {
      event_id: event.id,
      match_score: Math.min(score, 1),
      match_reason:
        reason.length > 0
          ? reason.join('；')
          : '这场活动可能对你有价值',
    };
  });
}

/**
 * Mock: 为活动推荐嘉宾
 */
export async function getRecommendedGuestsForEvent(
  eventId: string
): Promise<GuestRecommendation[]> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('description, target_audience, location')
    .eq('id', eventId)
    .single();

  if (!event) return [];

  // 获取嘉宾列表（排除已报名的）
  const { data: guests } = await supabase
    .from('profiles')
    .select('id, display_name, bio, industry, city')
    .eq('role', 'guest')
    .limit(20);

  if (!guests) return [];

  return guests.map((guest) => {
    let score = 0.5;
    const reason: string[] = [];

    if (
      guest.city &&
      event.location?.toLowerCase().includes(guest.city.toLowerCase())
    ) {
      score += 0.2;
      reason.push(`嘉宾在活动所在城市`);
    }

    if (
      guest.industry &&
      event.target_audience?.includes(guest.industry)
    ) {
      score += 0.2;
      reason.push(`嘉宾行业背景匹配目标画像`);
    }

    return {
      guest_id: guest.id,
      match_score: Math.min(score, 1),
      match_reason:
        reason.length > 0 ? reason.join('；') : '该嘉宾可能对活动感兴趣',
    };
  });
}
```

**Step 3: 运行测试**

```bash
pnpm test:run test/lib/ai/recommendation.test.ts
```

**Step 4: 提交**

```bash
git add .
git commit -m "feat: 添加 Mock AI 推荐服务（按关键词匹配）"
```

---

### Task 6.2: 首页展示 AI 推荐

**文件:**
- 修改: `src/app/[locale]/page.tsx`
- 创建: `src/components/features/recommendation-badge.tsx`

**Step 1: 修改首页逻辑**

- 未登录 / 主办方：显示普通活动列表
- 嘉宾：调用 `getRecommendedEventsForGuest`，按 match_score 排序，每张卡片显示推荐理由和匹配度

**Step 2: 创建推荐标记组件**

显示 match_score（圆形百分比）+ match_reason（小字说明）。

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 首页集成 AI 推荐排序（嘉宾视角）"
```

---

### Task 6.3: 活动管理页展示推荐嘉宾

**文件:**
- 修改: `src/app/[locale]/events/[id]/manage/page.tsx`

**Step 1: 添加"推荐嘉宾"tab**

调用 `getRecommendedGuestsForEvent`，展示嘉宾列表 + match_score + reason + "邀请"按钮。

点击"邀请"调用 `inviteGuest` action。

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 活动管理页集成 AI 推荐嘉宾"
```

---

## Phase 7: 我的活动 + 收尾

### Task 7.1: 我的活动页面

**文件:**
- 创建: `src/app/[locale]/my-events/page.tsx`

**Step 1: 创建我的活动页面**

Tabs 区分：
- **嘉宾视角：**
  - "已报名"：查询 `registrations` where guest_id = me AND type = 'applied'
  - "收到邀请"：查询 `registrations` where guest_id = me AND type = 'invited'
- **主办方视角：**
  - "已发布"：查询 `events` where organizer_id = me

每条记录显示活动信息 + 状态 badge + 操作按钮。

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加我的活动页面"
```

---

### Task 7.2: 完善错误处理

**文件:**
- 创建: `src/app/[locale]/error.tsx`
- 创建: `src/app/[locale]/not-found.tsx`
- 创建: `src/app/[locale]/loading.tsx`

**Step 1: 创建全局错误/加载/404 页面**

按 Next.js 约定创建这三个文件，使用 shadcn/ui 组件美化。

**Step 2: 提交**

```bash
git add .
git commit -m "feat: 添加错误处理页面（error, not-found, loading）"
```

---

### Task 7.3: 最终集成测试

**Step 1: 完整流程手动测试**

按以下流程验证：
1. 注册嘉宾账号 → 填写画像 → 看到活动列表
2. 注册主办方账号 → 发布活动 → 管理活动
3. 嘉宾报名活动 → 主办方看到报名 → 接受/拒绝
4. 主办方查看 AI 推荐嘉宾 → 邀请 → 嘉宾收到邀请
5. 中英文切换正常

**Step 2: 修复发现的问题**

**Step 3: 最终提交**

```bash
git add .
git commit -m "feat: MVP 功能完成"
```

---

## 风险和注意事项

| 风险 | 缓解措施 |
|------|----------|
| Supabase RLS 策略可能过于严格/宽松 | 每个 Phase 结束后在 Supabase Dashboard 中测试数据权限 |
| next-intl + Supabase middleware 冲突 | Task 2.1 已处理整合逻辑，注意 cookie 传递 |
| Server Component vs Client Component 边界 | 数据获取在 Server Component，交互在 Client Component |
| AI 推荐 Mock 与真实 API 接口差异 | Mock 已定义清晰的返回类型，后续替换只改内部实现 |
| Supabase 触发器在 auth.users 上可能需要数据库 admin 权限 | 通过 Supabase Dashboard SQL Editor 执行迁移 |

---

## 后续迭代（不在 MVP 范围）

1. 接入 Claude API 替换 Mock 推荐
2. ai_recommendations 缓存表使用
3. Freemium 限制逻辑
4. 头像上传（Supabase Storage）
5. 更丰富的活动筛选/搜索
6. Vercel 部署配置
