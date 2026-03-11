# LinkClaw

LinkClaw 是一个基于 Next.js App Router 的双语活动匹配平台，面向活动组织者与嘉宾两类角色，提供认证、活动发布、报名/邀请、我的活动管理，以及基于用户画像的推荐展示能力。

## 核心能力

- 双语站点：支持中文、英文两套路由与文案
- 用户认证：支持登录、注册、退出与认证回调
- 角色分流：区分 `organizer`（组织者）与 `guest`（嘉宾）
- 活动管理：组织者可创建活动、修改活动状态、管理活动详情
- 报名与邀请：嘉宾可报名活动，组织者可邀请嘉宾，嘉宾可处理邀请
- 推荐展示：首页会基于嘉宾画像对已发布活动进行推荐排序与理由说明

## 技术栈

- Next.js 16
- React 19
- TypeScript 5
- next-intl 4
- Supabase
- Tailwind CSS 4
- shadcn/ui
- Vitest + Testing Library

## 安装依赖

本项目默认使用 `pnpm`。

```bash
pnpm install
```

## 环境变量

项目依赖 Supabase 环境变量。若缺失，Supabase 客户端会直接抛错。

至少需要配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

当前代码也兼容旧变量名：

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

优先级为：

1. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

相关实现位置：

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`

## 本地开发

启动开发环境：

```bash
pnpm dev
```

默认访问地址：

- 中文首页：`http://localhost:3000/zh`
- 英文首页：`http://localhost:3000/en`

## 常用命令

```bash
pnpm dev            # 启动开发环境
pnpm build          # 构建生产包
pnpm start          # 启动生产服务
pnpm lint           # 运行 ESLint
pnpm test           # 运行 Vitest 监听模式
pnpm test:run       # 单次运行全部测试
pnpm test:coverage  # 生成测试覆盖率
```

运行单个测试文件示例：

```bash
pnpm vitest run test/app/profile-page.test.tsx
```

## 项目结构

```text
src/
  app/                  # App Router 页面、布局与 Server Actions
    [locale]/           # 按语言划分的页面入口
  components/           # UI 组件与业务组件
    features/           # 业务展示组件
    layout/             # 导航、语言切换等布局组件
    ui/                 # 基础通用组件
  i18n/                 # next-intl routing、request、navigation 配置
  lib/
    ai/                 # 当前为模拟推荐逻辑
    supabase/           # 浏览器端、服务端、middleware 的 Supabase 封装
  types/
    database.ts         # 数据库类型与业务枚举
messages/               # 中英文文案
test/                   # Vitest 测试与测试初始化
```

## 路由与国际化

项目以国际化路由为主干结构，而不是页面附加能力。

- 支持语言：`zh`、`en`
- 路由配置：`src/i18n/routing.ts`
- 请求配置：`src/i18n/request.ts`
- 导航封装：`src/i18n/navigation.ts`
- 根布局：`src/app/[locale]/layout.tsx`

约定：

- 页面位于 `[locale]` 目录下
- 页面与布局中会调用 `setRequestLocale(locale)`
- 页面跳转优先使用 `src/i18n/navigation.ts` 导出的导航能力

## 认证与访问控制

### 认证页面与动作

认证页面和动作位于：

- `src/app/[locale]/auth/`
- `src/app/[locale]/auth/actions.ts`
- `src/app/[locale]/auth/callback/route.ts`

注册时会把用户角色与昵称写入 Supabase auth metadata。

### Middleware

全局中间件位于：

- `src/middleware.ts`

它负责两件事：

1. 处理 `next-intl` 语言路由
2. 刷新 Supabase 会话并读取当前用户

当前受保护路径：

- `/profile`
- `/events/new`
- `/my-events`

当前认证页回跳规则：

- 已登录用户访问 `/auth/login`、`/auth/register` 会被重定向回首页

## 业务模块

### 1. 首页推荐

首页位于：

- `src/app/[locale]/page.tsx`

主要流程：

1. 获取当前用户与 `profiles` 数据
2. 拉取所有已发布活动
3. 当用户角色为 `guest` 时，调用模拟推荐逻辑
4. 渲染推荐理由与活动卡片

推荐逻辑位于：

- `src/lib/ai/mock-recommendation.ts`

### 2. 个人资料

个人资料页面与更新逻辑位于：

- `src/app/[locale]/profile/page.tsx`
- `src/app/[locale]/profile/actions.ts`

当前 `ProfileForm` 直接从页面文件导出，测试会直接引用该导出。

### 3. 活动管理

相关页面与动作位于：

- `src/app/[locale]/events/new/page.tsx`
- `src/app/[locale]/events/[id]/page.tsx`
- `src/app/[locale]/events/actions.ts`
- `src/app/[locale]/my-events/page.tsx`

当前支持：

- 组织者创建活动
- 设置活动状态：`draft` / `published` / `closed`
- 查看活动详情
- 在“我的活动”中管理活动

### 4. 报名与邀请

报名与邀请动作位于：

- `src/app/[locale]/registrations/actions.ts`

当前约束：

- 只有 `guest` 可以报名活动
- 只能报名已发布活动
- 不能报名自己发布的活动
- 只有组织者可邀请嘉宾
- 只有嘉宾可接受或拒绝邀请

## 数据模型

数据库类型集中定义在：

- `src/types/database.ts`

当前核心业务枚举：

- `UserRole`: `guest | organizer`
- `EventStatus`: `draft | published | closed`
- `RegistrationType`: `applied | invited`
- `RegistrationStatus`: `pending | accepted | rejected`

主要表结构包括：

- `profiles`
- `events`
- `registrations`
- `ai_recommendations`

## UI 组件

关键组件位置：

- `src/components/layout/navbar.tsx`：全局导航
- `src/components/layout/locale-switcher.tsx`：语言切换
- `src/components/features/event-card.tsx`：活动卡片

如果只是调整活动展示样式，优先修改 `EventCard`，避免多个页面重复实现卡片结构。

## 测试

Vitest 配置位于：

- `vitest.config.ts`
- `test/setup.ts`

当前测试方式以组件渲染测试为主：

- 使用 `jsdom`
- 使用 `@testing-library/jest-dom/vitest`
- 通过 mock `next-intl` 简化组件测试

现有示例测试：

- `test/app/profile-page.test.tsx`

## 最近值得关注的更新

- 首页已接入基于用户画像的模拟推荐展示
- 活动推荐理由支持多语言文案渲染
- 中英文认证与全局导航流程已接入
- Supabase 环境变量已兼容新的命名方式
- 项目中已存在 404 页面相关测试提交记录，后续补充文档或测试时可继续沿该方向完善

## 开发提示

以下改动通常需要联动检查：

1. 新增或修改表单字段
   - 页面 JSX
   - Server Action 中的 `FormData.get(...)`
   - Supabase `Insert` / `Update` 类型
   - 中英文文案

2. 新增页面或受保护页面
   - `[locale]` 路由结构
   - `setRequestLocale(locale)`
   - `src/middleware.ts` 中的访问控制
   - 导航入口

3. 调整业务枚举
   - `src/types/database.ts`
   - 状态判断逻辑
   - `messages/zh.json`
   - `messages/en.json`

4. 修改推荐逻辑
   - `src/lib/ai/mock-recommendation.ts`
   - 首页消费数据结构
   - 推荐理由翻译 key

## 说明

仓库此前的 `README.md` 为 Next.js 默认模板，已不再反映当前业务结构。后续请优先参考本 README 与项目内 `CLAUDE.md` 中的约定。
