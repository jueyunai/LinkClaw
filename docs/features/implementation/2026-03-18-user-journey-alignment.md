# User Journey Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户旅程文档与代码实现对齐，并补齐注册建档、首页引导、详情状态展示、邀请理由展示四个主链路缺口。

**Architecture:** 采用小步增量方式，先修正文档与国际化文案，再分别补齐认证建档、首页画像提示、活动详情状态展示和邀请理由展示。实现上遵循现有 Next.js App Router + Server Actions + next-intl 模式，不引入新的基础设施或抽象层。

**Tech Stack:** Next.js App Router, React 19, TypeScript, next-intl, Supabase, Vitest, Testing Library

---

## 文件结构与职责

- 修改：`docs/user-journey.md`
  - 将用户旅程文档调整为“现状 + 本轮补齐目标 + 规划项”口径。
- 修改：`messages/zh.json`
  - 增加首页画像引导、详情状态、邀请理由相关中文文案。
- 修改：`messages/en.json`
  - 增加首页画像引导、详情状态、邀请理由相关英文文案。
- 修改：`src/app/[locale]/auth/actions.ts`
  - 注册后显式创建 `profiles`，并处理建档失败。
- 修改：`src/app/[locale]/auth/callback/route.ts`
  - OAuth/回调登录成功后补建 `profiles`。
- 修改：`src/app/[locale]/page.tsx`
  - 首页根据 profile 缺失或字段不完整显示轻引导。
  - 如为便于测试，可最小化导出纯展示层组件或判断函数，但不要做无关重构。
- 修改：`src/app/[locale]/events/[id]/page.tsx`
  - 详情页查询 `registrations.type/status` 并区分 applied / invited 的状态文案。
  - 如为便于测试，可最小化导出纯展示层组件或状态映射函数。
- 修改：`src/app/[locale]/my-events/page.tsx`
  - 嘉宾邀请列表查询并展示 `ai_match_reason`。
  - 如为便于测试，可最小化导出邀请卡片组件。
- 新增：`test/app/home-page.test.tsx`
  - 通过测试纯展示层组件或判断函数，覆盖首页资料完善轻引导渲染逻辑。
- 新增：`test/app/event-detail-page.test.tsx`
  - 通过测试纯展示层组件或状态映射函数，覆盖详情页状态按钮/提示文案逻辑。
- 新增：`test/app/my-events-page.test.tsx`
  - 通过测试邀请卡片或 guest 展示层组件，覆盖邀请理由展示逻辑。

---

### Task 1: 修订用户旅程文档

**Files:**
- Modify: `docs/user-journey.md`

- [ ] **Step 1: 阅读现有旅程文档并标出需要降级/改写的条目**

重点检查以下条目是否要改写：
- “注册成功即创建 profile” → 标注为本轮补齐
- “首次登录进入 /profile” → 改为首页轻引导
- “取消报名” → 改为可选后续项
- “活动统计/Pro 功能” → 改为规划中
- “AI 推荐调用 Claude API” → 改为推荐系统 + fallback

- [ ] **Step 2: 修改文档为现状一致版**

要求：
- 保留原有场景结构
- 明确哪些为“已实现 / 本轮补齐 / 规划中”
- 不新增超出 spec 的功能

- [ ] **Step 3: 自查文档与 spec 一致**

核对：
- `docs/superpowers/specs/2026-03-17-user-journey-alignment-design.md`
- 本轮四项代码目标是否都已体现在文档中

---

### Task 2: 增加中英文文案

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Test: `test/app/home-page.test.tsx`
- Test: `test/app/event-detail-page.test.tsx`
- Test: `test/app/my-events-page.test.tsx`

**文案分组约束：**
- 首页轻引导：放在 `home`
- 报名/邀请状态展示：优先放在 `events`，避免与 `myEvents` 中列表状态文案语义混淆
- 邀请理由标题：放在 `myEvents`

**状态语义对照：**
- applied + pending/accepted/rejected → 报名语义
- invited + pending/accepted/rejected → 邀请语义

- [ ] **Step 1: 写出需要新增的文案 key 列表**

最少包含：
- 首页轻引导标题、说明、CTA
- 资料缺失提示文案
- 报名状态文案（pending/accepted/rejected）
- 邀请状态文案（pending/accepted/rejected 的邀请语义）
- 邀请理由标题

- [ ] **Step 2: 在 `messages/zh.json` 中添加中文文案**

要求：
- 放在现有 `home` / `events` / `myEvents` 等命名空间下
- 不重复创建含义重叠的 key

- [ ] **Step 3: 在 `messages/en.json` 中添加英文文案**

要求：
- 与中文 key 完全对齐
- 英文语义与 applied / invited 区分一致

- [ ] **Step 4: 快速检查 JSON 结构完整性**

Run: `pnpm lint`
Expected: 不出现 JSON 解析或导入错误

---

### Task 3: 注册与 OAuth 回调补建 `profiles`

**Files:**
- Modify: `src/app/[locale]/auth/actions.ts`
- Modify: `src/app/[locale]/auth/callback/route.ts`

- [ ] **Step 1: 先写一个最小辅助函数设计草图**

目标行为：
```ts
async function ensureProfileExists(...) {
  // 查 profiles
  // 不存在则插入最小记录
  // 已存在则直接返回
}
```

要求：
- 不新建额外 util 文件，优先放在 auth 相关文件内或共用最小本地函数
- 输入至少能拿到 `user.id`、`role`、`display_name`
- 若 OAuth metadata 缺少 `role`，不得默认提升权限；默认回退为 `guest`

- [ ] **Step 2: 在 `register()` 中接入显式建档**

实现要求：
- 调用 `supabase.auth.signUp`
- 若返回用户 ID 可用，则检查并插入 `profiles`
- 建档失败时重定向回注册页并携带错误信息

- [ ] **Step 3: 在 `callback/route.ts` 中接入首次登录补建**

实现要求：
- `exchangeCodeForSession(code)` 成功后读取当前用户
- 若 `profiles` 中无该用户记录，则按 auth metadata 补建
- 若 metadata 缺 role，则默认回退为 `guest`

- [ ] **Step 4: 覆盖邮箱注册与首次进入系统的补偿路径**

实现要求：
- 考虑 `signUp` 后可能拿不到可立即建档的 `user.id`
- 对此场景依赖后续首次登录/回调时补建，而不是假设注册当场一定建档成功
- 在代码注释或结构上让该补偿路径清晰可读（仅在必要处添加极简注释）

- [ ] **Step 5: 保证幂等与竞态安全最小可接受**

实现要求：
- 先查后插
- 允许数据库唯一约束作为最后兜底
- 遇到重复插入错误时视为可恢复，不要把已建档用户当失败处理

- [ ] **Step 7: 为高风险补建分支补最小自动化保护（可选但强烈建议）**

实现建议：
- 如已抽出最小纯函数或局部 helper，为以下情况补 1-2 个单测：
  - metadata 缺少 role 时默认回退 `guest`
  - 重复插入错误被视为可恢复
- 若最终不适合写单测，则在实现总结中明确记录手工验证结果与限制

---

### Task 4: 首页资料完善轻引导

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Test: `test/app/home-page.test.tsx`

- [ ] **Step 1: 选定最小可测试边界**

实现建议：
- 优先测试纯展示层组件或纯判断函数
- 避免直接测试整个 server page
- 沿用现有 `test/app/profile-page.test.tsx` 的模式 mock `next-intl`

- [ ] **Step 2: 写失败测试，覆盖引导显示条件**

```tsx
it('当已登录用户 profile 缺失时显示资料完善引导', () => {
  // render HomeContent or extracted helper target
  // expect CTA and helper text
})

it('当已登录用户缺少 bio/industry/city 时显示资料完善引导', () => {
  // expect CTA and helper text
})
```

- [ ] **Step 3: 运行单测确认失败**

Run: `pnpm vitest run test/app/home-page.test.tsx`
Expected: FAIL，提示缺少引导文案或组件

- [ ] **Step 4: 在首页实现轻引导**

实现要求：
- 所有已登录用户在 profile 不存在或 `bio/industry/city` 任一缺失时显示提示卡
- CTA 指向 `/profile`
- 不影响未登录用户首页
- 如最终出于产品考虑仅对 guest 展示，必须同步更新 spec/文档口径后再收窄实现

- [ ] **Step 5: 再跑单测确认通过**

Run: `pnpm vitest run test/app/home-page.test.tsx`
Expected: PASS

---

### Task 5: 活动详情页展示真实报名/邀请状态

**Files:**
- Modify: `src/app/[locale]/events/[id]/page.tsx`
- Test: `test/app/event-detail-page.test.tsx`

- [ ] **Step 1: 选定最小可测试边界**

实现建议：
- 优先测试 `EventDetailContent` 或最小抽取的状态映射函数
- 避免测试整页数据抓取逻辑
- 使用 props 驱动 applied / invited 状态组合

- [ ] **Step 2: 写失败测试，覆盖 applied / invited 两种语义**

```tsx
it('applied pending 时显示待审核文案并禁用按钮', () => {
  // expect pending application label
})

it('invited accepted 时显示已接受邀请文案', () => {
  // expect invited semantic label
})
```

- [ ] **Step 3: 运行单测确认失败**

Run: `pnpm vitest run test/app/event-detail-page.test.tsx`
Expected: FAIL，当前只有统一“已报名”按钮

- [ ] **Step 4: 最小实现详情页状态查询与渲染**

实现要求：
- 查询 `registrations` 时至少取 `type, status`
- `applied` 分支使用报名语义文案
- `invited` 分支使用邀请语义文案
- 本轮不在详情页处理邀请，只做展示
- 继续关注 `maybeSingle()` 在脏数据下的限制，但本轮不扩展到历史数据修复

- [ ] **Step 5: 再跑单测确认通过**

Run: `pnpm vitest run test/app/event-detail-page.test.tsx`
Expected: PASS

---

### Task 6: 我的活动页展示邀请理由

**Files:**
- Modify: `src/app/[locale]/my-events/page.tsx`
- Test: `test/app/my-events-page.test.tsx`

- [ ] **Step 1: 选定最小可测试边界**

实现建议：
- 优先测试 `GuestInvitationCard` 或 guest 展示层组件
- 使用 props 驱动 `ai_match_reason` 有/无 两种情况
- 沿用 mock `next-intl` 的方式，不直接测试 server data fetch

- [ ] **Step 2: 写失败测试，覆盖有/无 `ai_match_reason` 两种情况**

```tsx
it('邀请存在 ai_match_reason 时展示推荐理由区块', () => {
  // expect reason title and reason text
})

it('邀请没有 ai_match_reason 时不展示推荐理由区块', () => {
  // expect no reason block
})
```

- [ ] **Step 3: 运行单测确认失败**

Run: `pnpm vitest run test/app/my-events-page.test.tsx`
Expected: FAIL，当前未查询也未渲染理由

- [ ] **Step 4: 最小实现查询与展示**

实现要求：
- guest registrations 查询补充 `ai_match_reason`
- 仅在 invited card 且理由存在时显示区块
- 不改动 applied 列表结构

- [ ] **Step 5: 再跑单测确认通过**

Run: `pnpm vitest run test/app/my-events-page.test.tsx`
Expected: PASS

---

### Task 7: 回归验证与收口

**Files:**
- Modify: 如前述文件（若回归中发现必要小修）
- Test: `test/app/home-page.test.tsx`
- Test: `test/app/event-detail-page.test.tsx`
- Test: `test/app/my-events-page.test.tsx`

- [ ] **Step 1: 运行本轮相关测试**

Run: `pnpm vitest run test/app/profile-page.test.tsx test/app/home-page.test.tsx test/app/event-detail-page.test.tsx test/app/my-events-page.test.tsx`
Expected: PASS

- [ ] **Step 2: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: 人工检查受影响路径**

至少检查：
- 注册页 → 验证页
- 首页引导卡
- 活动详情状态按钮
- `/my-events` 邀请理由
- auth redirect/query 参数落点是否符合预期

- [ ] **Step 4: 手工验证认证建档补偿路径**

至少覆盖：
- 邮箱注册后未确认邮箱
- 邮箱确认后首次进入系统
- OAuth 首次登录
- 已有 profile 的重复登录

- [ ] **Step 5: 请求代码审查**

使用 `superpowers:requesting-code-review` 或 code-reviewer 子代理，对照本计划与 spec 复核实现。

---

## 开发任务清单（Backlog 输出）

### P0（本轮实现）
1. 注册后显式创建 `profiles`
2. OAuth/回调首次登录补建 `profiles`
3. 首页资料完善轻引导
4. 活动详情页展示真实报名/邀请状态
5. 我的活动页展示 `ai_match_reason`
6. 用户旅程文档改为现状一致版
7. 补齐相关中英文文案与最小测试

### P1（下一轮建议）
1. 取消报名（建议仅支持 `pending`）
2. 历史脏数据下同一活动多 registration 的展示优先级规则
3. `profiles` 建档失败后的更明确补偿提示

### P2（规划项）
1. 管理页统计看板
2. 更严格的 AI 多语言理由展示策略
3. 更完整的权限前置与资源授权梳理

---

## 测试与验收要点

- 新注册 guest / organizer 均能在 `profiles` 中获得最小记录
- OAuth/回调首次登录的历史无档用户可自动补建 `profiles`
- 已登录用户首页在画像不完整时看到引导卡
- event detail 根据 `type + status` 显示正确语义
- invited 列表能显示 `ai_match_reason`
- 文档不再把“取消报名”“统计看板”写成当前已实现
