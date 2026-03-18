# Guest Profile Journey Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让嘉宾个人画像从“首页一次性临时入口”升级为“个人中心长期固定模块”，并实现保存后按来源回跳、首页强弱提醒和个人中心承接闭环。

**Architecture:** 在现有 Next.js App Router + Server Actions + next-intl 架构上做最小增量改造：把画像完整度判断抽为可复用 helper，把 `from` 来源参数从入口页一路透传到 `updateProfile`，并让首页与 `/my-events` 共同消费同一套画像状态与成功反馈规则。首页强/弱提醒采用“服务端读 cookie + 客户端首次展示后写 cookie”的轻量方案，不新增数据库字段，不重做路由结构。

**Tech Stack:** Next.js App Router, React 19, TypeScript, next-intl, next/headers cookies, Supabase, Vitest, Testing Library

---

## 文件结构与职责

- Modify: `src/app/[locale]/profile/actions.ts`
  - 为 `updateProfile` 增加 `from` 参数归一化、成功回跳、失败保留来源参数。
- Modify: `src/app/[locale]/profile/page.tsx`
  - 读取 `searchParams.from` / `error`，将来源参数透传进表单；本页只负责编辑与错误展示，不再承接成功结果。
- Modify: `src/app/[locale]/page.tsx`
  - 读取画像完整度 helper 与首页提醒 cookie；区分强提醒 / 弱提醒；消费 `profileUpdated=true` 成功反馈。
- Modify: `src/app/[locale]/my-events/page.tsx`
  - 为嘉宾页增加顶部个人画像主卡片；消费 `profileUpdated=true` 成功反馈；保持主办方页主流程不变。
- Create: `src/components/features/profile-prompt-banner.tsx`
  - 仅负责客户端首次展示强提醒后写入 cookie，不承载文案与布局。
- Create: `src/lib/profile.ts`
  - 放置画像完整度判断、来源参数归一化、首页提醒 cookie key/helper 等可复用逻辑。
- Modify: `messages/zh.json`
  - 增加首页强/弱提醒、首页/个人中心成功反馈、个人中心画像卡片、角色化标题文案。
- Modify: `messages/en.json`
  - 与中文保持一一对应。
- Modify: `test/app/profile-page.test.tsx`
  - 覆盖来源参数 hidden input、错误提示与表单基础渲染。
- Modify: `test/app/home-page.test.tsx`
  - 继续沿用 `useTranslations: () => (key) => key` 的 mock 方式，覆盖首页成功反馈与强/弱提醒分支。
- Modify: `test/app/my-events-page.test.tsx`
  - 保留对 `GuestInvitationCard` 的现有覆盖，不在此文件混入整页嘉宾/主办方分流测试。
- Create: `test/app/my-events-page-server.test.tsx`
  - 新增页面级测试，覆盖嘉宾个人画像卡片与主办方结构不受影响。
- Create: `test/app/profile-actions.test.ts`
  - 直接覆盖 `updateProfile` 的 redirect 分支：`from=home`、`from=center`、缺失来源、失败保留来源。
  - 明确 mock `next/navigation` 的 `redirect`、`next-intl/server` 的 `getLocale`、`@/lib/supabase/server` 的 `createClient`。
- Create: `test/lib/profile.test.ts`
  - 覆盖 `isProfileComplete`、`normalizeProfileReturnTarget`、cookie key/helper 等纯逻辑。

---

### Task 1: 提炼画像流程共用逻辑

**Files:**
- Create: `src/lib/profile.ts`
- Test: `test/lib/profile.test.ts`

- [ ] **Step 1: 写失败测试，锁定画像完整度规则**

```ts
import { describe, expect, it } from 'vitest';
import { isGuestProfileComplete } from '@/lib/profile';

describe('isGuestProfileComplete', () => {
  it('bio industry city 都存在时返回 true', () => {
    expect(
      isGuestProfileComplete({
        bio: 'AI observer',
        industry: 'Internet',
        city: 'Guangzhou',
      }),
    ).toBe(true);
  });

  it('任一关键字段缺失时返回 false', () => {
    expect(
      isGuestProfileComplete({
        bio: 'AI observer',
        industry: null,
        city: 'Guangzhou',
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run test/lib/profile.test.ts`
Expected: FAIL，提示 `@/lib/profile` 或目标函数不存在。

- [ ] **Step 3: 写最小实现，包含来源参数归一化 helper**

```ts
export type ProfileReturnTarget = 'home' | 'center';

export function normalizeProfileReturnTarget(value: FormDataEntryValue | string | null | undefined): ProfileReturnTarget {
  return value === 'home' ? 'home' : 'center';
}

export function isGuestProfileComplete(profile: {
  bio?: string | null;
  industry?: string | null;
  city?: string | null;
} | null) {
  if (!profile) return false;
  return Boolean(profile.bio?.trim() && profile.industry?.trim() && profile.city?.trim());
}

export function getProfilePromptCookieName(userId: string) {
  return `linkclaw_profile_prompt_seen_${userId}`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run test/lib/profile.test.ts`
Expected: PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add test/lib/profile.test.ts src/lib/profile.ts
git commit -m "test: cover guest profile helpers"
```

---

### Task 2: 先用测试锁定 `updateProfile` 回跳规则

**Files:**
- Create: `test/app/profile-actions.test.ts`
- Modify: `src/app/[locale]/profile/actions.ts`
- Modify: `src/lib/profile.ts`

- [ ] **Step 1: 写失败测试，覆盖成功回跳到首页**

```ts
it('from=home 时保存成功后回首页并带 profileUpdated 参数', async () => {
  const formData = new FormData();
  formData.set('displayName', 'YC');
  formData.set('bio', 'AI observer');
  formData.set('industry', 'Internet');
  formData.set('city', 'Guangzhou');
  formData.set('from', 'home');

  await expect(updateProfile(formData)).rejects.toThrow(
    'REDIRECT:/zh?profileUpdated=true',
  );
});
```

- [ ] **Step 2: 写失败测试，覆盖成功回跳到个人中心与缺省分支**

```ts
it('from=center 时保存成功后回个人中心', async () => {
  const formData = new FormData();
  formData.set('displayName', 'YC');
  formData.set('from', 'center');

  await expect(updateProfile(formData)).rejects.toThrow(
    'REDIRECT:/zh/my-events?profileUpdated=true',
  );
});

it('来源缺失时默认回个人中心', async () => {
  const formData = new FormData();
  formData.set('displayName', 'YC');

  await expect(updateProfile(formData)).rejects.toThrow(
    'REDIRECT:/zh/my-events?profileUpdated=true',
  );
});
```

- [ ] **Step 3: 写失败测试，覆盖失败时保留来源参数**

```ts
it('保存失败时保留 from=home 并停留在 profile 页', async () => {
  updateEqMock.mockResolvedValueOnce({ error: { message: 'update failed' } });

  const formData = new FormData();
  formData.set('displayName', 'YC');
  formData.set('from', 'home');

  await expect(updateProfile(formData)).rejects.toThrow(
    'REDIRECT:/zh/profile?from=home&error=update%20failed',
  );
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `pnpm vitest run test/app/profile-actions.test.ts`
Expected: FAIL，当前实现固定跳回 `/profile?success=true`。

- [ ] **Step 5: 在 `updateProfile` 中实现最小回跳逻辑**

```ts
const from = normalizeProfileReturnTarget(formData.get('from'));

if (error) {
  redirect(`/${locale}/profile?from=${from}&error=${encodeURIComponent(error.message)}`);
}

const successUrl =
  from === 'home'
    ? `/${locale}?profileUpdated=true`
    : `/${locale}/my-events?profileUpdated=true`;

redirect(successUrl);
```

实现要求：
- 继续沿用现有 `Database['public']['Tables']['profiles']['Update']`。
- 不新增无关校验。
- 未登录仍保持跳登录页逻辑。

- [ ] **Step 6: 运行测试确认通过**

Run: `pnpm vitest run test/app/profile-actions.test.ts`
Expected: PASS

- [ ] **Step 7: 提交这一小步**

```bash
git add test/app/profile-actions.test.ts src/app/[locale]/profile/actions.ts src/lib/profile.ts
git commit -m "feat: route profile saves back to source"
```

---

### Task 3: 让 `/profile` 表单透传来源参数

**Files:**
- Modify: `src/app/[locale]/profile/page.tsx`
- Modify: `test/app/profile-page.test.tsx`
- Modify: `src/lib/profile.ts`

- [ ] **Step 1: 写失败测试，要求表单包含 hidden from 字段**

```tsx
it('会把来源参数透传给表单 hidden input', () => {
  render(
    <ProfileForm
      profile={null}
      error={undefined}
      success={false}
      from="home"
    />,
  );

  expect(screen.getByDisplayValue('home')).toHaveAttribute('type', 'hidden');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run test/app/profile-page.test.tsx`
Expected: FAIL，当前 `ProfileForm` 不接受 `from` props，也没有 hidden input。

- [ ] **Step 3: 最小改造页面读取并透传来源参数**

```tsx
const normalizedFrom = normalizeProfileReturnTarget(searchParams.from);

<ProfileForm
  profile={profileValues}
  error={error}
  success={false}
  from={normalizedFrom}
/>
```

并在表单中加入：

```tsx
<input type="hidden" name="from" value={from} />
```

要求：
- `ProfileForm` 继续导出，避免破坏现有测试入口。
- 删除 `success=true` 作为本页结果承接的设计；本轮 `ProfileForm` 不再依赖成功态 props 承接主流程。
- 错误提示仍保留。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run test/app/profile-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add src/app/[locale]/profile/page.tsx test/app/profile-page.test.tsx src/lib/profile.ts
git commit -m "feat: preserve profile return target in form"
```

---

### Task 4: 先让首页消费成功反馈和来源 CTA，并为强/弱提醒准备展示边界

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `test/app/home-page.test.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`

- [ ] **Step 1: 写失败测试，要求首页 CTA 指向 `/profile?from=home`**

```tsx
it('资料未完善时首页 CTA 指向 profile 并带 from=home', async () => {
  const page = await HomePage({
    params: Promise.resolve({ locale: 'zh' }),
    searchParams: Promise.resolve({}),
  });

  const html = renderToStaticMarkup(page);
  expect(html).toContain('href="/profile?from=home"');
});
```

- [ ] **Step 2: 写失败测试，要求首页支持 `profileUpdated=true` 成功提示**

```tsx
it('profileUpdated=true 时首页显示成功提示', async () => {
  const page = await HomePage({
    params: Promise.resolve({ locale: 'zh' }),
    searchParams: Promise.resolve({ profileUpdated: 'true' }),
  });

  const html = renderToStaticMarkup(page);
  expect(html).toContain('profileUpdatedSuccess');
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm vitest run test/app/home-page.test.tsx`
Expected: FAIL，当前没有 `searchParams`、CTA 也不带来源参数。

- [ ] **Step 4: 最小实现首页成功提示与来源 CTA**

实现要求：
- `HomePage` 接收 `searchParams`。
- 资料未完善 CTA 更新为 `/profile?from=home`。
- `profileUpdated=true` 时在首页主内容中显示成功提示。
- 成功提示文案放在 `home` 命名空间，不硬编码。

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm vitest run test/app/home-page.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交这一小步**

```bash
git add src/app/[locale]/page.tsx test/app/home-page.test.tsx messages/zh.json messages/en.json
git commit -m "feat: show profile return CTA on home"
```

---

### Task 5: 用客户端轻量写 cookie 实现首页强提醒 / 弱提醒

**Files:**
- Create: `src/components/features/profile-prompt-banner.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/lib/profile.ts`
- Modify: `test/app/home-page.test.tsx`

- [ ] **Step 1: 写失败测试，区分强提醒与弱提醒**

```tsx
it('未完善画像且未见过提示时显示强提醒', async () => {
  // mock cookies with no profile prompt cookie
  // expect strong prompt key in html
});

it('未完善画像且已见过提示时显示弱提醒', async () => {
  // mock cookies with profile prompt cookie
  // expect weak prompt key in html
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run test/app/home-page.test.tsx`
Expected: FAIL，当前只有单一提醒样式。

- [ ] **Step 3: 先写一个最小客户端提醒组件草图**

```tsx
'use client';

import { useEffect } from 'react';

type ProfilePromptBannerProps = {
  cookieName: string;
  enabled: boolean;
};

export function ProfilePromptBanner(props: ProfilePromptBannerProps) {
  useEffect(() => {
    if (props.enabled) {
      document.cookie = `${props.cookieName}=1; path=/; max-age=${60 * 60 * 24 * 30}`;
    }
  }, [props.cookieName, props.enabled]);

  return null;
}
```

要求：
- 该组件只负责“首次展示强提醒后在客户端写 cookie”。
- 页面结构和视觉内容仍由 server page 决定，不把整段首页逻辑迁成客户端。

- [ ] **Step 4: 最小实现 cookie 驱动的提醒强度**

实现要求：
- `src/app/[locale]/page.tsx` 通过 `cookies()` 读取 `getProfilePromptCookieName(user.id)` 对应 cookie。
- 仅对 `role === 'guest'` 的已登录用户应用强/弱提醒逻辑。
- 若 `profile` / `role` 缺失或异常，首页保守地不进入主办方专属流程，也不展示嘉宾画像提醒。
- 未见过 cookie 时服务端渲染强提醒，并挂载客户端组件写入 cookie。
- 已见过 cookie 且画像仍未完善时服务端渲染弱提醒。
- 画像已完善后不显示提醒。
- 主办方不进入画像提醒流程。

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm vitest run test/app/home-page.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交这一小步**

```bash
git add src/components/features/profile-prompt-banner.tsx src/app/[locale]/page.tsx src/lib/profile.ts test/app/home-page.test.tsx
git commit -m "feat: add profile prompt strength on home"
```

---

### Task 6: 在嘉宾个人中心增加固定画像主卡片

**Files:**
- Modify: `src/app/[locale]/my-events/page.tsx`
- Modify: `test/app/my-events-page.test.tsx`
- Create: `test/app/my-events-page-server.test.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Modify: `src/lib/profile.ts`

- [ ] **Step 1: 保持现有 invitation card 测试不动，只新增整页测试文件**

要求：
- `test/app/my-events-page.test.tsx` 继续专注 `GuestInvitationCard`，不在该文件新增 `MyEventsPage` server 渲染断言。
- 新增 `test/app/my-events-page-server.test.tsx` 覆盖 `MyEventsPage` 的嘉宾/主办方分流。
- 页面级测试继续沿用 `useTranslations: () => (key) => key` 的 mock 方式。

- [ ] **Step 2: 写失败测试，要求嘉宾页出现个人画像卡片**

```tsx
it('嘉宾个人中心显示个人画像卡片与编辑入口', async () => {
  const page = await MyEventsPage({
    params: Promise.resolve({ locale: 'zh' }),
    searchParams: Promise.resolve({}),
  });

  const html = renderToStaticMarkup(page);
  expect(html).toContain('guestTitle');
  expect(html).toContain('profileCardTitle');
  expect(html).toContain('from=center');
});
```

- [ ] **Step 3: 写失败测试，要求主办方页不出现嘉宾画像主卡片**

```tsx
it('主办方工作台不渲染嘉宾画像主卡片，并保持 organizer 标题语义', async () => {
  // mock organizer page
  // expect html not to contain profile card title key
  // expect html to contain organizerTitle
});

it('异常账户仍保留资料编辑入口，不展示主办方工作台主模块', async () => {
  // mock logged-in user with missing profile or invalid role
  // expect html to contain from=center entry
  // expect html not to contain organizerTitle
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `pnpm vitest run test/app/my-events-page-server.test.tsx test/app/my-events-page.test.tsx`
Expected: FAIL，当前嘉宾页没有画像主卡片。

- [ ] **Step 5: 最小实现嘉宾顶部画像卡片与成功提示**

实现要求：
- 嘉宾 `/my-events` 在报名/邀请上方增加画像主卡片。
- 嘉宾主标题升级为 `Guest Center / 个人中心` 语义，必须使用 `myEvents.guestTitle`（或最终等价 key），不得继续回退到旧通用标题 key。
- 嘉宾页需要有独立描述文案，说明该页承担个人画像、报名与邀请承接职责。
- CTA 指向本地化后的 profile 编辑链接，并保留 `from=center` 参数。
- 结合 `isGuestProfileComplete` 展示“待完善 / 已完善”状态。
- `profileUpdated=true` 时显示“个人画像已更新”提示。
- 主办方页保留原有创建活动与活动列表主流程。
- 主办方标题策略收敛为：主标题仍保持“我的活动 / My Events”，通过副标题强化 `Organizer Console`，不额外引入更大文案重构。
- 若已登录但 `profile` / `role` 异常，渲染一个保守兜底块：至少保留资料编辑入口，不展示主办方工作台主模块，也不让用户无路可走。

- [ ] **Step 6: 运行测试确认通过**

Run: `pnpm vitest run test/app/my-events-page-server.test.tsx test/app/my-events-page.test.tsx`
Expected: PASS

额外断言要求：
- 嘉宾页出现 `guestTitle`（或最终等价 key）与画像卡片。
- 主办方页不出现画像卡片，且仍保持 organizer/my-events 语义标题。

- [ ] **Step 7: 提交这一小步**

```bash
git add src/app/[locale]/my-events/page.tsx test/app/my-events-page-server.test.tsx test/app/my-events-page.test.tsx messages/zh.json messages/en.json src/lib/profile.ts
git commit -m "feat: add profile card to guest center"
```

---

### Task 7: 一次性收口 profile / home / my-events 文案

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Modify: `src/app/[locale]/profile/page.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/app/[locale]/my-events/page.tsx`

- [ ] **Step 1: 列出新增文案 key，并确保中英文一一对应**

最少包含：
- `home.profilePromptTitleStrong`
- `home.profilePromptDescriptionStrong`
- `home.profilePromptTitleWeak`
- `home.profilePromptDescriptionWeak`
- `home.profilePromptAction`
- `home.profileUpdatedSuccess`
- `myEvents.guestTitle`
- `myEvents.guestDescription`
- `myEvents.organizerTitle`
- `myEvents.organizerDescription`
- `myEvents.profileCardTitle`
- `myEvents.profileCardComplete`
- `myEvents.profileCardIncomplete`
- `myEvents.profileCardDescription`
- `myEvents.profileCardActionComplete`
- `myEvents.profileCardActionIncomplete`
- `myEvents.profileUpdatedSuccess`

- [ ] **Step 2: 写入中文与英文文案**

要求：
- 保持“推荐 + 邀请匹配”价值表达。
- key 完全对齐。
- 不新增含义重叠 key。

- [ ] **Step 3: 清理页面内旧文案依赖，确保全部接入新 key**

要求：
- 首页、个人中心、编辑页都只消费最终文案 key。
- 不在本轮保留过渡性硬编码。

- [ ] **Step 4: 快速验证 JSON 无误**

Run: `pnpm lint`
Expected: PASS，不出现 JSON 解析或 import 错误。

- [ ] **Step 5: 提交这一小步**

```bash
git add messages/zh.json messages/en.json src/app/[locale]/profile/page.tsx src/app/[locale]/page.tsx src/app/[locale]/my-events/page.tsx
git commit -m "feat: refine guest profile journey copy"
```

---

### Task 8: 全量回归并准备代码审查

**Files:**
- Modify: 如前述文件（若回归时发现必要小修）
- Test: `test/lib/profile.test.ts`
- Test: `test/app/profile-actions.test.ts`
- Test: `test/app/profile-page.test.tsx`
- Test: `test/app/home-page.test.tsx`
- Test: `test/app/my-events-page.test.tsx`
- Test: `test/app/my-events-page-server.test.tsx`

- [ ] **Step 1: 运行本轮相关测试**

Run: `pnpm vitest run test/lib/profile.test.ts test/app/profile-actions.test.ts test/app/profile-page.test.tsx test/app/home-page.test.tsx test/app/my-events-page.test.tsx test/app/my-events-page-server.test.tsx`
Expected: PASS

- [ ] **Step 2: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: 手工验证嘉宾主链路**

至少覆盖：
- 首页未完善时进入 `/profile?from=home`
- 首次保存后回首页并看到成功提示
- 再次进入首页时若仍未完善，提醒降级为弱提醒
- 从个人中心进入 `/profile?from=center`
- 保存后回 `/my-events` 并看到成功提示

- [ ] **Step 4: 手工验证角色边界**

至少覆盖：
- 主办方首页不出现画像提醒
- 主办方 `/my-events` 不出现嘉宾画像主卡片
- 嘉宾 `/my-events` 出现画像卡片且报名/邀请结构保持正常

- [ ] **Step 5: 请求代码审查**

使用 `superpowers:requesting-code-review` 或 code-reviewer 子代理，对照以下文档复核实现：
- `docs/superpowers/specs/2026-03-18-guest-profile-journey-design.md`
- `docs/superpowers/plans/2026-03-18-guest-profile-journey.md`

---

## 开发任务清单（Backlog 输出）

### P0（本轮实现）
1. 抽出画像流程共用 helper
2. `updateProfile` 按来源回跳并在失败时保留来源参数
3. `/profile` 表单透传 `from`
4. 首页消费 `profileUpdated=true` 成功提示并把 CTA 指向 `/profile?from=home`
5. 首页基于 cookie 区分强提醒 / 弱提醒
6. 嘉宾 `/my-events` 增加顶部个人画像主卡片与成功提示
7. 补齐中英文文案与最小行为测试

### P1（下一轮建议）
1. 将首页成功提示从 query 驱动升级为消费后自动清理
2. 更精细的强/弱提醒生命周期策略（如按登录会话或更严格过期控制）
3. 进一步统一嘉宾“个人中心”与主办方“工作台”的标题和导航语义

### P2（规划项）
1. 真正引入 `/account` 或独立个人中心路由
2. 扩展更多画像字段与完成度进度条
3. 引入更完整的 onboarding 状态管理

---

## 测试与验收要点

- `from=home` / `from=center` / 缺失来源 三种分支 redirect 正确。
- 保存失败时保留来源参数，二次提交仍能回到原来源页。
- 首页只对未完善画像的嘉宾显示强/弱提醒。
- 首页 CTA 带 `from=home`，个人中心 CTA 带 `from=center`。
- 嘉宾 `/my-events` 有稳定画像入口，主办方流程不被打断。
- 所有新增文案均在中英文文件中对齐。
