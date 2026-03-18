# Global Interaction Pattern Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 LinkClaw 建立第一版统一提交交互规则，并先在活动创建页与活动管理页落地右对齐主操作、按钮 pending 反馈和一致化结果提示体验。

**Architecture:** 保持现有 Next.js App Router + Server Actions + redirect 流程不变，只补齐交互层原语与页面接入。通过一个表单级 pending 按钮组件和一个统一操作区容器，让 `events/new` 与 `events/[id]/manage` 先成为全站提交交互样板；pending 文案统一沉淀到 `common.pending`，错误码化与全量国际化不纳入本轮。

**Tech Stack:** Next.js App Router, React 19, TypeScript, next-intl, Supabase, Vitest, Testing Library

---

## 文件结构与职责

- Create: `src/components/ui/pending-submit-button.tsx`
  - 基于 `useFormStatus()` 提供表单内按钮 pending 文案切换与禁用态。
- Create: `src/components/ui/form-actions.tsx`
  - 提供统一的右对齐操作区容器，约束按钮布局与间距。
- Modify: `src/app/[locale]/events/new/page.tsx`
  - 将创建页底部操作区改为统一容器，并接入 pending 按钮。
- Modify: `src/app/[locale]/events/[id]/manage/page.tsx`
  - 将管理页的保存、发布/下架、邀请、通过/拒绝申请等独立 form 全部接入统一交互原语。
- Modify: `messages/zh.json`
  - 新增 `common.pending` 中文文案。
- Modify: `messages/en.json`
  - 新增 `common.pending` 英文文案。
- Create: `test/components/ui/pending-submit-button.test.tsx`
  - 覆盖 idle / pending 文案切换、禁用态、form 作用域边界。
- Create: `test/components/ui/form-actions.test.tsx`
  - 覆盖默认右对齐容器 class 和布局约束。
- Modify: `test/app/new-event-page.test.tsx`
  - 覆盖创建页使用统一操作区和双按钮结构。
- Modify: `test/app/manage-event-page.test.tsx`
  - 覆盖管理页使用统一操作区，且关键提交入口仍正确渲染。

---

### Task 1: 交互原语与公共文案

**Files:**
- Create: `src/components/ui/pending-submit-button.tsx`
- Create: `src/components/ui/form-actions.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Test: `test/components/ui/pending-submit-button.test.tsx`
- Test: `test/components/ui/form-actions.test.tsx`

- [ ] **Step 1: 写 `PendingSubmitButton` 的失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import { useFormStatus } from 'react-dom';
import { PendingSubmitButton } from '@/components/ui/pending-submit-button';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    useFormStatus: vi.fn(),
  };
});

it('idle 时显示默认文案', () => {
  vi.mocked(useFormStatus).mockReturnValue({ pending: false, data: null, method: null, action: null });
  render(<PendingSubmitButton idleText="保存修改" pendingText="保存中..." />);
  expect(screen.getByRole('button', { name: '保存修改' })).toBeEnabled();
});

it('pending 时显示进行中文案并禁用', () => {
  vi.mocked(useFormStatus).mockReturnValue({ pending: true, data: null, method: null, action: null });
  render(<PendingSubmitButton idleText="保存修改" pendingText="保存中..." />);
  expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
});

it('仅反映当前 form 的 pending 状态', () => {
  vi.mocked(useFormStatus).mockReturnValue({ pending: false, data: null, method: null, action: null });
  render(
    <>
      <form>
        <PendingSubmitButton idleText="保存修改" pendingText="保存中..." />
      </form>
      <form>
        <PendingSubmitButton idleText="发布活动" pendingText="发布中..." />
      </form>
    </>
  );
  expect(screen.getByRole('button', { name: '保存修改' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '发布活动' })).toBeEnabled();
});
```

- [ ] **Step 2: 运行原语测试确认失败**

Run: `pnpm vitest run test/components/ui/pending-submit-button.test.tsx test/components/ui/form-actions.test.tsx`
Expected: FAIL，提示组件或导出不存在。

- [ ] **Step 3: 写 `FormActions` 的失败测试**

```tsx
import { render } from '@testing-library/react';
import { FormActions } from '@/components/ui/form-actions';

it('默认使用右对齐和换行布局', () => {
  const { container } = render(
    <FormActions>
      <button type="button">次操作</button>
      <button type="submit">主操作</button>
    </FormActions>,
  );

  expect(container.firstChild).toHaveClass('flex', 'flex-wrap', 'justify-end');
});
```

- [ ] **Step 4: 最小实现 `PendingSubmitButton`**

```tsx
'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PendingSubmitButtonProps = React.ComponentProps<typeof Button> & {
  idleText: string;
  pendingText: string;
};

export function PendingSubmitButton({
  idleText,
  pendingText,
  disabled,
  className,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      className={cn('min-w-24', className)}
      {...props}
    >
      {pending ? pendingText : idleText}
    </Button>
  );
}
```

要求：
- 仅作用于当前 form。
- 透传现有 `Button` 的 variant / size / className。
- 用最小宽度或等效策略减少文案切换跳动。

- [ ] **Step 5: 最小实现 `FormActions`**

```tsx
import { cn } from '@/lib/utils';

export function FormActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap justify-end gap-2', className)} {...props} />;
}
```

- [ ] **Step 6: 补齐公共 pending 文案**

在 `messages/zh.json` / `messages/en.json` 的 `common` 下增加：

```json
"pending": {
  "saving": "保存中...",
  "publishing": "发布中...",
  "processing": "处理中...",
  "inviting": "邀请中..."
}
```

```json
"pending": {
  "saving": "Saving...",
  "publishing": "Publishing...",
  "processing": "Processing...",
  "inviting": "Inviting..."
}
```

- [ ] **Step 7: 再跑原语测试确认通过**

Run: `pnpm vitest run test/components/ui/pending-submit-button.test.tsx test/components/ui/form-actions.test.tsx`
Expected: PASS

- [ ] **Step 8: 可选提交检查点**

仅在用户明确要求 commit 时执行：

```bash
git add src/components/ui/pending-submit-button.tsx src/components/ui/form-actions.tsx messages/zh.json messages/en.json test/components/ui/pending-submit-button.test.tsx test/components/ui/form-actions.test.tsx
git commit -m "feat: add shared pending form actions"
```

---

### Task 2: 改造活动创建页

**Files:**
- Modify: `src/app/[locale]/events/new/page.tsx`
- Modify: `test/app/new-event-page.test.tsx`

- [ ] **Step 1: 先写创建页失败测试**

```tsx
it('使用统一右对齐操作区渲染保存草稿和直接发布按钮', async () => {
  const page = await NewEventPage({
    params: Promise.resolve({ locale: 'zh' }),
    searchParams: Promise.resolve({}),
  });

  const { container } = render(page);
  expect(screen.getByRole('button', { name: 'saveDraft' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'publishNow' })).toBeInTheDocument();
  expect(container.querySelector('.justify-end')).toBeTruthy();
});
```

- [ ] **Step 2: 运行创建页测试确认失败**

Run: `pnpm vitest run test/app/new-event-page.test.tsx`
Expected: FAIL，当前操作区仍是左侧/拉伸布局，且未使用统一容器。

- [ ] **Step 3: 在创建页接入交互原语**

实现要求：
- 引入 `FormActions` 和 `PendingSubmitButton`。
- 用 `useTranslations('common')` 读取 `common.pending.*` 文案。
- 保持两个按钮仍在同一个 `<form>` 中。
- 右对齐，不再使用 `flex-1` 平铺占满整行。
- `saveDraft` 使用 `common.pending.saving`。
- `publishNow` 使用 `common.pending.publishing`。

示意：

```tsx
<FormActions>
  <PendingSubmitButton
    name="intent"
    value="draft"
    variant="outline"
    idleText={tEvents('saveDraft')}
    pendingText={tCommon('pending.saving')}
  />
  <PendingSubmitButton
    name="intent"
    value="publish"
    idleText={tEvents('publishNow')}
    pendingText={tCommon('pending.publishing')}
  />
</FormActions>
```

- [ ] **Step 4: 再跑创建页测试确认通过**

Run: `pnpm vitest run test/app/new-event-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 可选提交检查点**

仅在用户明确要求 commit 时执行：

```bash
git add src/app/[locale]/events/new/page.tsx test/app/new-event-page.test.tsx
git commit -m "feat: unify create event form actions"
```

---

### Task 3: 改造活动管理页

**Files:**
- Modify: `src/app/[locale]/events/[id]/manage/page.tsx`
- Modify: `test/app/manage-event-page.test.tsx`

- [ ] **Step 1: 先写管理页失败测试**

```tsx
it('草稿活动使用统一操作区渲染发布和保存按钮', () => {
  const { container } = render(<ManageEventContent ...status="draft" ... />);
  expect(screen.getByRole('button', { name: 'publish' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'saveChanges' })).toBeInTheDocument();
  expect(container.querySelectorAll('.justify-end').length).toBeGreaterThan(0);
});

it('推荐嘉宾卡片仍渲染邀请按钮并接入统一操作区', () => {
  render(<ManageEventContent ...recommendedGuests=[...] ... />);
  expect(screen.getByRole('button', { name: 'inviteGuest' })).toBeInTheDocument();
});

it('报名申请卡片仍渲染通过与拒绝按钮并接入统一操作区', () => {
  render(<ManageEventContent ...appliedGuests=[{ status: 'pending', ... }] ... />);
  expect(screen.getByRole('button', { name: 'acceptApplication' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'rejectApplication' })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行管理页测试确认失败**

Run: `pnpm vitest run test/app/manage-event-page.test.tsx`
Expected: FAIL，当前保存按钮区未使用统一右对齐容器。

- [ ] **Step 3: 改造页面头部状态操作**

实现要求：
- 发布 / 重新发布 / 下架按钮改为 `PendingSubmitButton`。
- 每个独立 form 外层或相邻容器统一接入 `FormActions` 或等价的 `justify-end` 右对齐容器。
- 发布使用 `common.pending.publishing`。
- 下架 / 关闭使用 `common.pending.processing`。
- 保持每个按钮仍在独立 `<form>` 中，不做跨 form 联动。

- [ ] **Step 4: 改造活动编辑表单保存区**

实现要求：
- 底部保存按钮放入 `FormActions`。
- 使用 `PendingSubmitButton`。
- 文案：`saveChanges` / `common.pending.saving`。

- [ ] **Step 5: 改造推荐嘉宾邀请按钮**

实现要求：
- 推荐卡片的邀请按钮替换为 `PendingSubmitButton`。
- 邀请按钮所在区域使用 `FormActions` 或等价的右对齐操作区容器。
- 使用 `common.pending.inviting`。
- 保留 `event.status !== 'published'` 时的禁用逻辑。
- 不改变推荐理由与禁用提示结构。

- [ ] **Step 6: 改造报名申请处理按钮**

实现要求：
- 通过 / 拒绝按钮都改为 `PendingSubmitButton`。
- 两者所在区域使用 `FormActions` 或等价的右对齐操作区容器。
- 两者统一使用 `common.pending.processing`。
- 保持各自独立 form，不新增共享状态。

- [ ] **Step 7: 再跑管理页测试确认通过**

Run: `pnpm vitest run test/app/manage-event-page.test.tsx`
Expected: PASS

- [ ] **Step 8: 可选提交检查点**

仅在用户明确要求 commit 时执行：

```bash
git add src/app/[locale]/events/[id]/manage/page.tsx test/app/manage-event-page.test.tsx
git commit -m "feat: unify manage event submission states"
```

---

### Task 4: 结果提示区对齐、回归验证与收口

**Files:**
- Modify: 如上述文件（若验证中发现必要小修）
- Test: `test/components/ui/pending-submit-button.test.tsx`
- Test: `test/components/ui/form-actions.test.tsx`
- Test: `test/app/new-event-page.test.tsx`
- Test: `test/app/manage-event-page.test.tsx`

- [ ] **Step 1: 对齐两页的结果提示区位置与样式策略**

实现要求：
- `events/new` 保持“失败留在当前页、成功跳转到 manage 页”的现有模式，不重写创建成功流程。
- `events/[id]/manage` 中现有 success / error 提示仍集中在主内容顶部，避免散落到各卡片局部。
- 如需要小幅整理提示分支顺序或包裹结构，应保持现有 success key 兼容。

- [ ] **Step 2: 运行本轮相关测试**

Run: `pnpm vitest run test/components/ui/pending-submit-button.test.tsx test/components/ui/form-actions.test.tsx test/app/new-event-page.test.tsx test/app/manage-event-page.test.tsx`
Expected: PASS

- [ ] **Step 3: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: 手工验证中文 locale**

准备方式：
- 使用一个 organizer 账号登录。
- 准备一个自己创建的 draft 活动作为管理页入口，确保可覆盖“发布”和“保存修改”。
- 将该活动发布后，再验证“下架”和“邀请”；若要验证“通过/拒绝申请”，需先用 guest 账号对该活动发起至少一条报名申请。

至少检查：
- `/zh/events/new`
- `/zh/events/<真实event-id>/manage`

确认：
- 主操作右对齐
- 点击后按钮立即进入 pending
- pending 时不可重复提交
- 创建失败留在当前页、创建成功跳转到 manage 页
- 管理页 success / error 提示仍集中在主内容顶部

- [ ] **Step 5: 手工验证英文 locale**

准备方式同上，改为英文路由。

至少检查：
- `/en/events/new`
- `/en/events/<真实event-id>/manage`

确认：
- pending 文案为英文
- 创建成功仍跳转到 manage 页展示 success
- 管理页各动作的 pending 文案与结果提示不混用中文

- [ ] **Step 6: 请求代码审查**

使用 `superpowers:requesting-code-review` 或 code-reviewer 子代理，对照：
- `docs/superpowers/specs/2026-03-18-global-interaction-pattern-design.md`
- 本计划文档

复核实现是否满足规范基线。

- [ ] **Step 7: 可选最终提交**

仅在用户明确要求 commit 时执行：

```bash
git add src/components/ui/pending-submit-button.tsx src/components/ui/form-actions.tsx src/app/[locale]/events/new/page.tsx src/app/[locale]/events/[id]/manage/page.tsx messages/zh.json messages/en.json test/components/ui/pending-submit-button.test.tsx test/components/ui/form-actions.test.tsx test/app/new-event-page.test.tsx test/app/manage-event-page.test.tsx
git commit -m "feat: unify submission interaction patterns"
```

---

## 开发批次建议（供 subagent-driven development 使用）

### 批次 A：基础原语与文案
- Task 1

### 批次 B：活动创建页
- Task 2
- 依赖批次 A 完成

### 批次 C：活动管理页
- Task 3
- 依赖批次 A 完成

### 批次 D：验证与收口
- Task 4
- 依赖批次 B / C 完成

---

## 测试与验收要点

- 新增的共享组件只承担交互展示职责，不引入业务逻辑分叉。
- `PendingSubmitButton` 的 pending 作用域仅限所在 form。
- `events/new` 保持“失败留在当前页、成功跳转到 manage 页”的现有结果模式。
- `events/[id]/manage` 中的多处独立 form 都能获得一致交互体验。
- `zh` / `en` 两个 locale 下 pending 文案与结果提示均正确。
