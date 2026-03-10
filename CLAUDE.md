# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 最高指令
本项目连续执行，无需在每个编码步骤前重复确认

## 常用命令

本仓库有 `pnpm-lock.yaml`，默认使用 `pnpm`。

- 安装依赖：`pnpm install`
- 启动开发环境：`pnpm dev`
- 构建生产包：`pnpm build`
- 启动生产服务：`pnpm start`
- 运行 ESLint：`pnpm lint`
- 运行 Vitest 监听模式：`pnpm test`
- 单次运行全部测试：`pnpm test:run`
- 生成测试覆盖率：`pnpm test:coverage`
- 运行单个测试文件：`pnpm vitest run test/app/profile-page.test.tsx`

## 开发前提

Supabase 客户端会在缺少环境变量时直接抛错。开发和测试依赖以下变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

相关实现见 [src/lib/supabase/server.ts](src/lib/supabase/server.ts) 和 [src/lib/supabase/client.ts](src/lib/supabase/client.ts)。

## 项目整体结构

这是一个基于 Next.js App Router 的双语活动匹配平台，主要技术栈是：

- Next.js 16 + React 19
- `next-intl` 处理中英文路由与消息加载
- Supabase 负责认证、会话与业务数据
- Tailwind CSS 4 + shadcn/ui 负责界面
- Vitest + Testing Library 负责组件测试

代码主要按以下层次组织：

- [src/app/](src/app/)：页面入口与 Server Actions。所有业务页面都在 `[locale]` 下，按语言路由分区。
- [src/components/](src/components/)：UI 组件和业务组件。
  - [src/components/ui/](src/components/ui/)：基础通用组件。
  - [src/components/layout/](src/components/layout/)：导航、语言切换等全局布局组件。
  - [src/components/features/](src/components/features/)：事件卡片等业务展示组件。
- [src/lib/](src/lib/)：跨页面复用的基础能力。
  - [src/lib/supabase/](src/lib/supabase/)：浏览器端、服务端和 middleware 用的 Supabase 客户端封装。
  - [src/lib/ai/](src/lib/ai/)：当前是模拟推荐逻辑，主页会读取它生成推荐结果。
- [src/i18n/](src/i18n/)：`next-intl` 的 routing、navigation、request 配置。
- [src/types/database.ts](src/types/database.ts)：整个项目的数据库结构与业务枚举类型来源。
- [messages/](messages/)：国际化文案，当前维护 `zh.json` 与 `en.json`。
- [test/](test/)：Vitest 测试与测试初始化文件。

## 路由与国际化架构

国际化是这个仓库的主干结构，不是页面上的附加能力。

- 语言配置在 [src/i18n/routing.ts](src/i18n/routing.ts)，当前仅支持 `zh` 和 `en`。
- `next-intl` 的 request 配置在 [src/i18n/request.ts](src/i18n/request.ts)，运行时按 locale 动态加载 [messages/](messages/) 下对应 JSON。
- 自定义导航 API 在 [src/i18n/navigation.ts](src/i18n/navigation.ts)，项目里跳转优先使用这里导出的 `Link` / `redirect`。
- 根布局 [src/app/[locale]/layout.tsx](src/app/[locale]/layout.tsx) 负责：
  - 校验 locale 是否合法
  - 调用 `setRequestLocale(locale)`
  - 注入 `NextIntlClientProvider`
  - 挂载全局 [Navbar](src/components/layout/navbar.tsx)
- 页面级组件通常会再次调用 `setRequestLocale(locale)`，例如 [src/app/[locale]/page.tsx](src/app/[locale]/page.tsx)。新增页面时要保持这个模式。

## Middleware 与认证访问控制

全局 middleware 在 [src/middleware.ts](src/middleware.ts)。它同时做两件事：

1. 调用 `next-intl` middleware 处理语言路由。
2. 调用 [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) 刷新 Supabase 会话并读取当前用户。

当前受保护路径和认证页重定向规则都定义在 [src/middleware.ts](src/middleware.ts)：

- 未登录访问 `/profile`、`/events/new`、`/my-events` 会跳到登录页。
- 已登录访问 `/auth/login`、`/auth/register` 会被重定向回首页。

如果新增需要登录保护的页面，优先同步更新这里，而不是只在页面内部补判断。

## 业务主线

### 认证

认证相关页面与动作在 [src/app/[locale]/auth/](src/app/[locale]/auth/)。

- 登录、注册、退出的 Server Actions 在 [src/app/[locale]/auth/actions.ts](src/app/[locale]/auth/actions.ts)。
- OAuth/邮件回调入口在 [src/app/[locale]/auth/callback/route.ts](src/app/[locale]/auth/callback/route.ts)。
- 注册时会把 `role` 和 `display_name` 放进 Supabase auth metadata。

### 个人资料

- 页面在 [src/app/[locale]/profile/page.tsx](src/app/[locale]/profile/page.tsx)。
- 更新动作在 [src/app/[locale]/profile/actions.ts](src/app/[locale]/profile/actions.ts)。
- 当前表单组件 `ProfileForm` 直接从页面文件导出，测试也直接引用它，见 [test/app/profile-page.test.tsx](test/app/profile-page.test.tsx)。修改页面结构时注意不要破坏这个导出方式。

### 活动管理

- 新建活动页面在 [src/app/[locale]/events/new/page.tsx](src/app/[locale]/events/new/page.tsx)。
- 详情页在 [src/app/[locale]/events/[id]/page.tsx](src/app/[locale]/events/[id]/page.tsx)。
- 活动相关 Server Actions 在 [src/app/[locale]/events/actions.ts](src/app/[locale]/events/actions.ts)。
- 我的活动页在 [src/app/[locale]/my-events/page.tsx](src/app/[locale]/my-events/page.tsx)。

这里的关键约束：

- `createEvent` / `updateEventStatus` 都走 Server Action，并且最终通过 `redirect()` 回到带 query 参数的页面。
- 组织者权限检查封装在 [src/app/[locale]/events/actions.ts](src/app/[locale]/events/actions.ts) 内部的 `requireOrganizer()`。
- 活动状态枚举来自 [src/types/database.ts](src/types/database.ts) 的 `EventStatus`。

### 报名与邀请

报名与邀请响应逻辑在 [src/app/[locale]/registrations/actions.ts](src/app/[locale]/registrations/actions.ts)。

- `applyToEvent()`：只允许 `guest` 报名已发布活动，且不能报名自己发布的活动。
- `respondToInvitation()`：只允许 `guest` 处理自己收到的邀请。

这些动作会同时依赖：

- Supabase 当前用户
- `profiles.role`
- `events.status`
- `registrations` 表中的 `type` / `status`

因此修改相关流程时，通常需要一起检查 [src/types/database.ts](src/types/database.ts)、页面表单字段和 Server Action 的 `FormData` 读取逻辑。

### 首页推荐

首页在 [src/app/[locale]/page.tsx](src/app/[locale]/page.tsx)。

它的流程是：

1. 读取当前用户和 profile。
2. 拉取已发布活动。
3. 如果当前用户是 `guest`，调用 [src/lib/ai/mock-recommendation.ts](src/lib/ai/mock-recommendation.ts) 生成推荐结果。
4. 把推荐理由和活动列表一起渲染到首页。

如果后续接入真实 AI 服务，优先保持输出结构与首页当前消费方式兼容，而不是直接把页面逻辑改成另一套数据形状。

## 数据层约定

数据库结构集中定义在 [src/types/database.ts](src/types/database.ts)。这里不仅有表结构，还有整个项目依赖的业务枚举：

- `UserRole`: `guest | organizer`
- `EventStatus`: `draft | published | closed`
- `RegistrationType`: `applied | invited`
- `RegistrationStatus`: `pending | accepted | rejected`

仓库里很多 Supabase 写入和更新都会显式使用：

- `Database['public']['Tables']['...']['Insert']`
- `Database['public']['Tables']['...']['Update']`

如果改表字段或枚举，不要只改单个页面；至少同步检查相关页面查询字段、Server Actions 和翻译文案。

## UI 结构

- 全局导航在 [src/components/layout/navbar.tsx](src/components/layout/navbar.tsx)，它会读取当前用户和 profile 决定显示内容。
- 语言切换器在 [src/components/layout/locale-switcher.tsx](src/components/layout/locale-switcher.tsx)。
- 事件列表卡片统一使用 [src/components/features/event-card.tsx](src/components/features/event-card.tsx)。

如果只是调整活动展示样式，优先改 `EventCard`，不要在多个页面重复拼同类卡片结构。

## 测试约定

Vitest 配置在 [vitest.config.ts](vitest.config.ts)：

- `jsdom` 环境
- `globals: true`
- `setupFiles: ['./test/setup.ts']`
- `@/` 指向 `src/`

当前测试重点是组件渲染，而不是端到端流程：

- [test/setup.ts](test/setup.ts) 只注入 `@testing-library/jest-dom/vitest`
- [test/app/profile-page.test.tsx](test/app/profile-page.test.tsx) 通过 mock `next-intl` 来测试 `ProfileForm`

如果要补前端组件测试，沿用这个模式：

- 直接渲染组件
- 需要翻译时 mock `next-intl`
- 避免在单测里依赖真实的 Supabase 或 middleware

## 修改时最容易漏掉的同步点

以下改动经常是多处联动的：

1. **新增或修改表单字段**
   - 页面 JSX
   - 对应 Server Action 的 `FormData.get(...)`
   - Supabase `Insert` / `Update` 类型
   - 中英文文案

2. **新增页面或受保护页面**
   - `[locale]` 路由结构
   - `setRequestLocale(locale)`
   - middleware 中的访问控制
   - navbar/跳转入口

3. **调整业务状态枚举**
   - [src/types/database.ts](src/types/database.ts)
   - 所有状态判断逻辑
   - `messages/zh.json` 和 `messages/en.json`

4. **修改推荐逻辑**
   - [src/lib/ai/mock-recommendation.ts](src/lib/ai/mock-recommendation.ts)
   - 首页推荐渲染和推荐理由翻译 key

## 已确认但不值得照搬 README 的信息

仓库里的 [README.md](README.md) 仍然是 Next.js 默认模板，对实际业务结构帮助不大。后续分析和修改请优先参考本文件以及 `src/` 下的真实实现。