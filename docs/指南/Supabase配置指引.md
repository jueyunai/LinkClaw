# Supabase 配置操作指引

本文用于指导 LinkClaw 项目完成 Supabase 项目创建、本地环境变量配置、数据库初始化与认证配置。

## 1. 创建 Supabase 项目

1. 打开 Supabase 官网并登录。
2. 进入 Dashboard，点击 **New project**。
3. 选择组织后，填写以下信息：
   - **Name**：建议填写 `LinkClaw`
   - **Database Password**：设置一个安全密码并保存
   - **Region**：建议选择距离主要用户较近的区域
4. 点击创建，等待项目初始化完成。

创建完成后，你会进入该项目的 Dashboard。

---

## 2. 获取环境变量并配置本地文件

本项目需要以下两个环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 获取位置

在 Supabase Dashboard 中：

1. 进入 **Settings**。
2. 打开 **API** 页面。
3. 找到：
   - **Project URL** → 对应 `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys** 下的 **anon public** → 对应 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 本地配置

在项目根目录创建 `.env.local` 文件。

可以直接参考仓库中的 `.env.local.example`：

```env
# Supabase 配置
# 在 Supabase Dashboard → Settings → API 中获取
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

将其替换为你自己的真实值，例如：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

注意：
- `.env.local` 不要提交到 git
- 修改环境变量后，需要重启本地开发服务器

---

## 3. 初始化数据库结构

当前仓库已提供 SQL 迁移文件，路径如下：

- `supabase/migrations/001_profiles.sql`
- `supabase/migrations/002_events.sql`
- `supabase/migrations/003_registrations.sql`
- `supabase/migrations/004_ai_recommendations.sql`
- `supabase/migrations/005_rls_policies.sql`

### 执行方式

你现在可以先用 **Supabase Dashboard 的 SQL Editor** 手动执行。

### 建议执行顺序

请严格按以下顺序执行：

1. `001_profiles.sql`
2. `002_events.sql`
3. `003_registrations.sql`
4. `004_ai_recommendations.sql`
5. `005_rls_policies.sql`

### 每个迁移的作用

#### 001_profiles.sql
- 创建 `user_role` 枚举
- 创建 `profiles` 表
- 创建新用户注册后自动插入 profile 的触发器
- 创建 `updated_at` 自动更新时间触发器

#### 002_events.sql
- 创建 `event_status` 枚举
- 创建 `events` 表
- 创建相关索引
- 配置更新时间触发器

#### 003_registrations.sql
- 创建 `registration_type`、`registration_status` 枚举
- 创建 `registrations` 表
- 配置唯一约束与索引
- 配置更新时间触发器

#### 004_ai_recommendations.sql
- 创建 `recommendation_target` 枚举
- 创建 `ai_recommendations` 表
- 创建推荐查询相关索引

#### 005_rls_policies.sql
- 为各表启用 RLS
- 创建访问策略，保证用户只能访问被允许的数据

### SQL Editor 执行方法

1. 打开 Supabase Dashboard
2. 进入 **SQL Editor**
3. 新建一个 query
4. 复制某个 migration 文件内容
5. 点击运行
6. 确认执行成功后，再执行下一个文件

如果其中某一步失败，不要跳过，先修复当前错误后再继续下一步。

---

## 4. 配置认证能力

本项目当前使用 Supabase Auth 的邮箱密码登录，并已实现回调路由：

- `src/app/[locale]/auth/callback/route.ts`

### 4.1 开启 Email 登录

在 Supabase Dashboard 中：

1. 进入 **Authentication**
2. 打开 **Providers**
3. 确认 **Email** 已启用
4. 开启 Email + Password 登录方式

### 4.2 配置站点地址

进入：

- **Authentication → URL Configuration**

你至少需要配置以下内容。

#### Site URL

本地开发时建议填写：

```text
http://localhost:3000
```

#### Redirect URLs

建议加入：

```text
http://localhost:3000/auth/callback
http://localhost:3000/zh/auth/callback
http://localhost:3000/en/auth/callback
```

如果你后续部署到线上，再额外加入线上域名，例如：

```text
https://your-domain.com/auth/callback
https://your-domain.com/zh/auth/callback
https://your-domain.com/en/auth/callback
```

> 说明：当前项目代码中的实际回调实现位于带 locale 的 App Router 目录下，因此建议把带 locale 的地址一起加入白名单。

---

## 5. 启动本地项目进行联调

在项目根目录执行：

```bash
pnpm install
pnpm dev
```

启动后访问：

```text
http://localhost:3000
```

### 建议验证流程

#### 5.1 注册新用户

1. 打开注册页
2. 使用邮箱、密码、昵称注册
3. 选择角色：
   - guest
   - organizer
4. 提交后确认是否成功登录或跳转

#### 5.2 登录

1. 打开登录页
2. 输入邮箱和密码
3. 提交后确认是否正确进入首页或目标页

#### 5.3 验证 profile 是否自动生成

进入 Supabase 的 **Table Editor**：

- 查看 `profiles` 表
- 确认新注册用户是否自动生成了一条 profile 记录

#### 5.4 编辑个人资料

1. 登录后访问 `/zh/profile` 或 `/en/profile`
2. 修改昵称、简介、行业、城市
3. 提交保存
4. 确认页面是否出现成功提示
5. 在 Supabase 表里确认数据是否更新

#### 5.5 验证权限与路由保护

重点检查：

- 未登录访问 `/zh/profile` 是否跳转到登录页
- 已登录用户访问 `/zh/auth/login` 是否被重定向
- organizer 是否能继续访问活动创建页

---

## 6. 推荐的后续命令行方式（可选）

如果你后续希望把 Supabase 管理流程标准化，可以再安装 Supabase CLI。

典型流程会是：

```bash
supabase login
supabase link --project-ref <你的项目ref>
supabase db push
```

不过当前仓库阶段，**优先建议先使用 Dashboard + SQL Editor 手动执行迁移**，这样最直接，也更容易排查问题。

---

## 7. 常见问题排查

### 问题 1：页面提示缺少 Supabase 环境变量

排查：
- 是否已创建 `.env.local`
- 变量名是否拼写正确
- 修改后是否已重启 `pnpm dev`

---

### 问题 2：注册成功但 `profiles` 表没有记录

排查：
- `001_profiles.sql` 是否成功执行
- `handle_new_user()` 触发器是否创建成功
- 是否在 Supabase SQL Editor 中执行时报错但未注意

---

### 问题 3：登录或回调失败

排查：
- `Authentication -> URL Configuration` 中的 URL 是否正确
- 是否包含本地开发地址
- 回调路径是否与项目代码一致
- 当前访问的 locale 是否已加入 Redirect URLs

---

### 问题 4：可以登录，但查询/写入数据时报权限错误

排查：
- `005_rls_policies.sql` 是否执行成功
- 当前用户是否已登录
- 相关表的 policy 是否允许当前用户执行该操作

---

### 问题 5：活动或资料更新时报数据库类型/字段错误

排查：
- SQL 迁移是否全部按顺序执行
- 数据表字段名是否与代码一致
- 日期字段、枚举字段值是否符合数据库定义

---

## 8. 当前项目中与 Supabase 相关的关键文件

你后续如果要排查问题，可以优先看这些文件：

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`
- `src/app/[locale]/auth/actions.ts`
- `src/app/[locale]/auth/callback/route.ts`
- `src/app/[locale]/profile/actions.ts`
- `src/types/database.ts`
- `supabase/migrations/*.sql`

---

## 9. 建议你完成配置后的自检清单

你可以按下面清单逐项确认：

- [ ] Supabase 项目已创建
- [ ] `.env.local` 已填写真实 URL 和 anon key
- [ ] 5 个 migration 已按顺序执行
- [ ] Email Provider 已开启
- [ ] Site URL 已配置
- [ ] Redirect URLs 已配置
- [ ] 本地 `pnpm dev` 可正常启动
- [ ] 注册功能可用
- [ ] 登录功能可用
- [ ] `profiles` 自动创建成功
- [ ] `/profile` 页面可读写数据

---

## 10. 配置完成后建议通知我继续做的事情

等你完成以上配置后，我建议下一步继续做：

1. 用真实 Supabase 环境验证认证流程
2. 修正当前手写 `Database` 类型与真实 schema 的差异
3. 生成正式数据库类型，替换当前临时类型定义
4. 继续推进活动发布、活动列表、活动详情等后续功能
