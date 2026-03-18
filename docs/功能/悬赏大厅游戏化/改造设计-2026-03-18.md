# 悬赏大厅游戏化改造设计

- **日期**：2026-03-18
- **范围**：全站世界观换皮 + 猎人段位体系 + 任务分级 + 小精灵 MVP + 管理后台

---

## 1. 目标

将 LinkClaw 从"平庸的活动匹配平台"改造为**悬赏榜**风格的游戏化平台。核心变化：

1. 发布活动 → 发布悬赏任务
2. 嘉宾报名 → 赏金猎人接单
3. 从低级开始练手、逐步晋升段位
4. AI 分身 → 小精灵（私宠/侦察助手）

**战略意图**：通过游戏化叙事提升用户参与感和留存，同时底层复用现有架构，最小化改动成本。

---

## 2. 设计原则

1. **游戏化包装层，不重建底层**：`events`、`registrations`、`profiles` 表结构增量修改，不重建
2. **UI 层换皮，角色枚举不碰**：`UserRole` 保持 `guest | organizer`，仅在展示层翻译为猎人/悬赏人
3. **段位是纯增量**：MVP 人工管理，不引入积分/经验值系统
4. **小精灵 MVP 最小化**：仅做悬赏侦察 + 接单评估，复用现有推荐 Pipeline

---

## 3. UI 设计风格概述

### 3.1 整体基调：冒险者公会大厅

视觉方向不是"换个配色的 SaaS"，而是让用户一进来就感受到**公会冒险氛围**。关键词：

> 温暖木质感 · 羊皮纸质地 · 金属徽章 · 烛光暖色 · 冒险地图

在 shadcn/ui 的基础上，通过配色、质感和细节点缀实现氛围感，不需要完全推翻组件库。

### 3.2 配色体系

**主色调**：从标准 SaaS 冷灰切换到暖色公会系。

| 用途 | 现有（SaaS 风格） | 改为（公会风格） | 说明 |
|------|------------------|-----------------|------|
| 背景主色 | `slate-50` 白灰 | `stone-50` / `amber-50` 暖米色 | 羊皮纸/木板底色感 |
| 卡片背景 | 纯白 `white` | `amber-50` / `stone-100` | 略带纸质质感 |
| 主强调色 | 蓝色系 `blue-600` | 琥珀金 `amber-600` / 深棕 `amber-800` | 公会金色调 |
| 次强调色 | — | 深红 `red-800` | 悬赏令/紧急任务 |
| 文字主色 | `slate-900` | `stone-800` / `amber-900` | 偏暖的深色 |
| 边框/分隔线 | `slate-200` | `stone-300` / `amber-200` | 柔和暖边框 |

**段位专属色**（已在 `HUNTER_LEVEL_META` 定义）：

| 段位 | 颜色 | 用途 |
|------|------|------|
| 青铜 | `#CD7F32` 铜棕 | 段位徽章、卡片边框高亮 |
| 白银 | `#C0C0C0` 银灰 | 同上 |
| 黄金 | `#FFD700` 金黄 | 同上 |
| 铂金 | `#E5E4E2` 铂白 | 同上 |
| 钻石 | `#B9F2FF` 冰蓝 | 同上 |
| 传说 | `#FF6B35` 烈焰橙 | 同上，额外加发光/光晕效果 |

### 3.3 排版与字体

- **标题**：保持现有无衬线字体，但关键标题（"悬赏大厅""悬赏任务"等）加粗 + 金色强调，营造公告牌视觉
- **段位标签**：使用小号大写字母（`uppercase tracking-wider`），配合段位色背景，模拟金属铭牌
- **小精灵文案**：使用略带斜体或手写感的样式（`italic` 或自定义字重），与正文区分，突出"精灵在说话"的感觉

### 3.4 关键视觉元素

**悬赏任务卡片（EventCard）**：
- 卡片边框改为与 `bounty_rank` 段位色对应的左侧色条（4px 竖条）
- 左上角段位徽章：圆形/盾形小标，内含段位图标 + 段位名
- 段位不足时：卡片整体 `opacity-50` + 右上角锁图标 + 悬浮提示"需要 XX 段位"
- 底部保留悬赏人头像 + "悬赏人"标签

**段位徽章（RankBadge）**：
- 盾形或圆形小图标，背景为段位色，内含段位缩写或小图标
- 传说段位额外加 `animate-pulse` 光晕或金边框
- 统一尺寸两档：小号（卡片内、列表行内）和大号（个人档案页）

**小精灵气泡（SpriteBubble）**：
- 左侧小精灵头像（MVP 用一个固定的可爱精灵图标/emoji）
- 右侧对话气泡，气泡有尖角指向精灵
- 气泡背景：淡金色 `amber-50`，边框 `amber-200`
- 不同 variant 对应不同气泡色调：
  - `info`（侦察结果）：淡金 `amber-50`
  - `success`（适合接单）：淡绿 `emerald-50`
  - `warning`（段位不足）：淡红 `rose-50`

**悬赏大厅（首页）**：
- 页面顶部标题区域带有"公告牌"感：深色背景条 + 金色标题文字
- 小精灵侦察气泡位于标题下方
- 任务列表区域为网格卡片布局（现有），但卡片换上上述风格

**个人档案页**：
- 顶部醒目展示段位信息：大号段位徽章 + 段位名 + 段位色渐变背景条
- 猎人称号："XX 段位猎人"

### 3.5 动效与微交互

MVP 阶段只加最基本的：

| 元素 | 动效 | 实现方式 |
|------|------|---------|
| 段位徽章（传说） | 缓慢脉冲光晕 | `animate-pulse` |
| 小精灵气泡 | 进场淡入 + 轻微上浮 | `animate-in fade-in slide-in-from-bottom-2` |
| 锁定任务卡片悬浮 | 显示"需要 XX 段位"提示 | Tailwind `group-hover` + tooltip |
| 接单按钮 | 段位不足时禁用态 | `disabled:opacity-50 disabled:cursor-not-allowed` |

不做复杂动画、粒子效果或3D变换，这些留给后续版本。

### 3.6 适配约束

- **依然基于 shadcn/ui**：不引入新的组件库，通过 Tailwind 覆盖配色和补充样式类实现
- **深色模式暂不适配**：MVP 只做亮色公会风格，深色模式在后续迭代
- **移动端响应式保持现有方案**：卡片网格自动适配，不新增断点逻辑
- **图片资源最小化**：MVP 不使用自定义插画/背景图，全部通过 CSS/Tailwind 实现质感（渐变、阴影、边框色），避免引入资源管理复杂度

---

## 4. 世界观术语映射

| 现有概念 | 代码层保留 | UI 展示（中文） | UI 展示（英文） |
|---------|-----------|----------------|----------------|
| 平台首页 | `/[locale]/page.tsx` | 悬赏大厅 | Bounty Hall |
| 组织者 organizer | `UserRole: "organizer"` | 悬赏人 | Commissioner |
| 嘉宾 guest | `UserRole: "guest"` | 猎人 | Hunter |
| 活动 event | `events` 表 | 悬赏任务 | Bounty Quest |
| 报名 apply | `RegistrationType: "applied"` | 接单 | Claim |
| 邀请 invite | `RegistrationType: "invited"` | 指名委托 | Direct Commission |
| AI 分身 | `ai_recommendations` / `ai_profiles` | 小精灵 | Sprite |
| 推荐 | `recommendation.ts` → `mock-recommendation.ts` | 悬赏侦察 | Bounty Scout |
| 我的活动 | `/my-events` | 我的悬赏 / 我的接单 | My Bounties / My Claims |

**关键约束**：所有术语变更仅影响 `messages/zh.json` 和 `messages/en.json`，以及页面组件的展示文案。数据库字段名、枚举值、Server Action 参数名保持不变。

---

## 5. 猎人段位体系

### 4.1 段位定义

| 等级值 | 段位名（中） | 段位名（英） | 说明 |
|--------|-------------|-------------|------|
| 1 | 青铜 | Bronze | 新注册猎人默认段位 |
| 2 | 白银 | Silver | |
| 3 | 黄金 | Gold | |
| 4 | 铂金 | Platinum | |
| 5 | 钻石 | Diamond | |
| 6 | 传说 | Legend | 仅限平台手动授予，不可通过常规晋升获得 |

### 4.2 数据模型变更

`profiles` 表新增字段：

```
hunter_level  integer  NOT NULL  DEFAULT 1
  -- 1=青铜 2=白银 3=黄金 4=铂金 5=钻石 6=传说
  -- CHECK (hunter_level >= 1 AND hunter_level <= 6)
```

`events` 表新增字段：

```
bounty_rank  integer  NOT NULL  DEFAULT 1
  -- 该悬赏任务要求的最低猎人段位
  -- CHECK (bounty_rank >= 1 AND bounty_rank <= 5)
  -- 注意上限是 5（钻石），不是 6。传说猎人不存在"传说级任务"门槛，
  --   他们的特殊性体现在身份标识而非任务等级。
```

`src/types/database.ts` 新增：

```typescript
// 猎人段位：1-5 为常规段位，6 为平台授予的特殊段位
export type HunterLevel = 1 | 2 | 3 | 4 | 5 | 6;

// 悬赏任务难度等级：1-5，对应青铜到钻石
export type BountyRank = 1 | 2 | 3 | 4 | 5;

// 段位元数据：仅保留颜色等非文案属性，段位名称统一走 next-intl 翻译（hunter.level_*）
export const HUNTER_LEVEL_META: Record<HunterLevel, { key: string; color: string }> = {
  1: { key: 'bronze', color: '#CD7F32' },
  2: { key: 'silver', color: '#C0C0C0' },
  3: { key: 'gold', color: '#FFD700' },
  4: { key: 'platinum', color: '#E5E4E2' },
  5: { key: 'diamond', color: '#B9F2FF' },
  6: { key: 'legend', color: '#FF6B35' },
};
```

`Profile` 接口新增：

```typescript
export interface Profile {
  // ... 现有字段
  hunter_level: HunterLevel;
}
```

`Event` 接口新增：

```typescript
export interface Event {
  // ... 现有字段
  bounty_rank: BountyRank;
}
```

### 4.3 段位门槛校验

在 `src/app/[locale]/registrations/actions.ts` 的 `applyToEvent()` 中新增校验：

```
现有校验链：
  1. 必须登录
  2. 必须是 guest 角色
  3. 活动必须是 published 状态
  4. 不能报名自己发布的活动

新增第 5 条：
  5. hunter_level >= event.bounty_rank，否则返回错误"段位不足，无法接单"
```

**数据获取变更**：当前 `applyToEvent()` 中：
- profile 查询 `select('role')` → 改为 `select('role, hunter_level')`
- event 查询 `select('id, organizer_id, status')` → 改为 `select('id, organizer_id, status, bounty_rank')`

**注意**：`respondToInvitation()`（指名委托响应）不做段位校验——悬赏人既然主动指名，说明已认可该猎人。

### 4.4 段位与角色的关系

- `hunter_level` 字段对所有用户存在（DB DEFAULT 1），但仅对 `guest`（猎人）角色有业务意义
- `organizer`（悬赏人）的 `hunter_level` 值不在任何 UI 展示，不参与任何业务逻辑
- 新用户注册时 profile 由 Supabase trigger 插入，`hunter_level` 靠 DB DEFAULT 1 自动设置，注册 Server Action 无需额外处理

### 4.5 段位管理（MVP）

MVP 阶段段位由管理员手动管理，不引入积分/经验值/自动晋升。

管理方式：简易管理页面 `/admin/hunters`（见第 8 节）。

---

## 6. 悬赏任务分级

### 6.1 分级规则

- 每个悬赏任务由悬赏人在发布时设置"最低接单段位"（`bounty_rank`）
- 默认值为 1（青铜），即所有猎人均可接单
- 可选范围：青铜(1) → 白银(2) → 黄金(3) → 铂金(4) → 钻石(5)
- **向上开放**：段位 ≥ 门槛的猎人均可接单（黄金任务 → 黄金/铂金/钻石/传说均可）

### 6.2 发布页改造

在 `src/app/[locale]/events/new/page.tsx` 的创建活动表单中新增字段：

```
"最低接单段位" 下拉选择器
  选项：青铜 / 白银 / 黄金 / 铂金 / 钻石
  默认：青铜
```

对应 Server Action `createEvent()` 新增 `FormData.get('bounty_rank')` 读取。

### 6.3 编辑任务时的段位修改

`updateEvent()` 也需要支持 `bounty_rank` 字段的读取和更新：
- `parseEventFormData()` 新增读取 `bounty_rank`
- `eventUpdate` 对象包含 `bounty_rank`
- 编辑表单同样展示"最低接单段位"选择器，预填当前值

### 6.4 Insert / Update 类型适配

`Profile` 新增 `hunter_level` 后：
- `profiles.Insert` = `Omit<Profile, 'created_at' | 'updated_at'>` → `hunter_level` 会出现在 Insert 类型中
- 由于 DB 有 DEFAULT 1，实际插入时可不传。在 TypeScript 层面将 `hunter_level` 标记为可选：`Insert: Omit<Profile, 'created_at' | 'updated_at'> & { hunter_level?: HunterLevel }`

`Event` 新增 `bounty_rank` 后：
- `events.Insert` → `bounty_rank` 会成为必填。`createEvent()` 中的 `eventInsert` 对象必须包含此字段
- 或同样将 DB DEFAULT 映射为 TypeScript 可选：`Insert: ... & { bounty_rank?: BountyRank }`

---

## 7. 小精灵 MVP

### 6.1 定位

小精灵是猎人的个人 AI 助手，以游戏化口吻呈现现有推荐逻辑的结果。MVP 阶段统一形象和名字，不支持自定义。

### 6.2 能力 1：悬赏侦察

- **触发时机**：猎人访问首页（悬赏大厅）
- **底层实现**：段位过滤在 `src/lib/ai/recommendation.ts` 的 `getEventRecommendations()` 调用侧统一处理——对传入的 events 列表先按 `bounty_rank <= hunter_level` 过滤，再交给推荐 Pipeline（无论走真实 AI Pipeline 还是 mock 降级）。同时 `src/lib/ai/pipeline/types.ts` 的 `EventDetailInput` 需扩展 `bounty_rank` 字段
- **展示形式**：页面顶部小精灵气泡框
- **文案风格示例**：
  - 中文：`"主人，我帮你侦察了悬赏大厅，发现 {count} 个适合你的任务！"`
  - 英文：`"Master, I've scouted the Bounty Hall and found {count} quests for you!"`
- **推荐理由**：从"匹配度分析"改为小精灵第一人称口吻
  - 中文：`"这个任务的主题和你的专长很匹配，我觉得你一定能胜任！"`
  - 英文：`"This quest aligns perfectly with your expertise — I'm sure you'll ace it!"`

### 6.3 能力 2：接单评估

- **触发时机**：猎人查看悬赏任务详情页
- **底层实现**：根据 `hunter_level` vs `bounty_rank` 的差值 + 现有推荐打分生成评估文案
- **展示形式**：任务详情页内的小精灵分析卡片
- **数据获取**：详情页 `events/[id]/page.tsx` 是 Server Component，需要：
  1. event 查询扩展 `select` 包含 `bounty_rank`
  2. 当前用户 profile 查询扩展包含 `hunter_level`
  3. 段位差值在 Server Component 中计算，直接传给小精灵评估组件（纯展示，无需客户端计算）
  4. 推荐分数：查询 `ai_recommendations` 表中当前用户对该任务的已有推荐记录（如存在），否则仅展示段位维度评估
- **评估维度**：
  1. 段位匹配度（段位差值）
  2. 专长匹配度（现有推荐分数，如有）
- **文案分级**：

| 段位差值 | 语气 | 示例（中文） |
|---------|------|-------------|
| ≥ 2（远超） | 轻松自信 | "这个任务对你来说太简单了，闭着眼都能完成！" |
| 1（略高） | 鼓励 | "刚好在你的能力范围内，稳了！" |
| 0（刚好） | 正常 | "难度匹配，值得一试。" |
| -1（略低） | 提醒挑战 | "这个任务有些挑战，但我觉得你可以试试！" |
| < -1（段位不足） | 遗憾 | "抱歉主人，你的段位还不够接这个任务…再练练就好了！" |

**任务可见性策略**：段位不足的任务对猎人**仍然可见**（首页卡片半透明+锁图标，详情页可正常访问）。仅**接单按钮**被禁用。这样做的好处是让猎人知道"段位提升后可以解锁更多任务"，形成晋升动力。因此差值 -1 和 < -1 的评估文案都会被触发。

### 6.4 小精灵 UI 组件

新增组件 `src/components/features/sprite-bubble.tsx`：

- 统一的小精灵气泡 UI（头像 + 气泡框 + 文案）
- MVP 使用固定图标（可用 emoji 或简单 SVG）
- 接收 `message` 和 `variant`（info / success / warning）属性

### 6.5 后续迭代能力（本轮不做）

| 能力 | 迭代版本 |
|------|---------|
| 悬赏人的小精灵（主动寻找猎人并发起指名委托） | V2 |
| Agent 间对话（双方小精灵互评沟通） | V2 |
| 段位顾问（晋升路径建议） | V2 |
| 小精灵人格/外观自定义 | V2 |
| 小精灵成长体系 | V4 |

---

## 8. 管理后台

### 7.1 页面

新增 `/admin/hunters` 页面：

- 猎人列表（显示：头像、昵称、当前段位、注册时间）
- 每行一个段位下拉选择器，可直接修改
- 保存后即时生效

### 7.2 访问控制

采用硬编码白名单方式：

```typescript
// src/lib/admin.ts
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') ?? [];

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}
```

- 环境变量 `ADMIN_EMAILS` 配置管理员邮箱列表，逗号分隔

**middleware 两层访问控制**：

1. 将 `/admin` 加入 `protectedPaths` 数组 → 未登录用户跳转登录页（复用现有逻辑）
2. 已登录用户：在 middleware 中通过 `user.email` 检查白名单，非管理员重定向回首页（`NextResponse.redirect()` 而非 403，保持与现有架构一致）

**注意**：Supabase Auth 的 `user.email` 在 OAuth 场景下可能为空。`isAdmin()` 接收 `string | undefined`，空值直接返回 false。

**管理后台复用现有 layout**：`/admin/hunters` 页面位于 `[locale]` 下，复用现有根 layout（含 Navbar）。不新增专属 admin layout——MVP 只有一个管理页面，无需侧边栏。页面内需调用 `setRequestLocale(locale)`。

### 7.3 Server Action

新增 `src/app/[locale]/admin/actions.ts`：

```
updateHunterLevel(formData: FormData):
  - 校验当前用户是否在 ADMIN_EMAILS 白名单
  - 读取 target_user_id 和 new_level
  - 校验 new_level 在 1-6 范围内
  - 更新 profiles.hunter_level
  - revalidatePath('/admin/hunters')
```

---

## 9. 前端页面变更清单

| 页面 | 文件 | 变更内容 |
|------|------|---------|
| 首页 | `src/app/[locale]/page.tsx` | 标题改为"悬赏大厅"；新增小精灵侦察气泡；推荐理由改为小精灵口吻 |
| 任务详情 | `src/app/[locale]/events/[id]/page.tsx` | 标题改为"悬赏详情"；新增小精灵评估卡片；接单按钮段位不足时禁用 |
| 发布页 | `src/app/[locale]/events/new/page.tsx` | 标题改为"发布悬赏"；新增"最低接单段位"选择器 |
| 个人主页 | `src/app/[locale]/profile/page.tsx` | 新增段位徽章展示 |
| 我的活动 | `src/app/[locale]/my-events/page.tsx` | 标题按角色：悬赏人看"我的悬赏"，猎人看"我的接单" |
| 导航栏 | `src/components/layout/navbar.tsx` | "活动"→"悬赏大厅"，角色标签改为猎人/悬赏人 |
| 任务卡片 | `src/components/features/event-card.tsx` | 新增段位徽章（左上角）；段位不足时卡片半透明+锁图标。新增 props：`bountyRank: BountyRank`、`hunterLevel?: HunterLevel`（猎人视角传入，悬赏人/未登录不传）。调用方（首页、我的活动页）负责传入当前用户段位 |
| 管理后台 | `src/app/[locale]/admin/hunters/page.tsx`（新增） | 猎人段位管理列表 |

---

## 10. 国际化文案变更

### 9.1 新增翻译 key

需在 `messages/zh.json` 和 `messages/en.json` 中新增以下 key 分组：

```
bounty:
  hall_title: "悬赏大厅" / "Bounty Hall"
  quest: "悬赏任务" / "Bounty Quest"
  claim: "接单" / "Claim"
  direct_commission: "指名委托" / "Direct Commission"
  commissioner: "悬赏人" / "Commissioner"
  min_rank: "最低接单段位" / "Minimum Rank"
  rank_insufficient: "段位不足，无法接单" / "Rank insufficient to claim this quest"
  my_bounties: "我的悬赏" / "My Bounties"
  my_claims: "我的接单" / "My Claims"

hunter:
  title: "猎人" / "Hunter"
  level_bronze: "青铜" / "Bronze"
  level_silver: "白银" / "Silver"
  level_gold: "黄金" / "Gold"
  level_platinum: "铂金" / "Platinum"
  level_diamond: "钻石" / "Diamond"
  level_legend: "传说" / "Legend"

sprite:
  scout_message: "主人，我帮你侦察了悬赏大厅，发现 {count} 个适合你的任务！"
    / "Master, I've scouted the Bounty Hall and found {count} quests for you!"
  eval_easy: "这个任务对你来说太简单了，闭着眼都能完成！"
    / "This quest is a breeze for you — easy as pie!"
  eval_comfortable: "刚好在你的能力范围内，稳了！"
    / "Right in your comfort zone — you've got this!"
  eval_matched: "难度匹配，值得一试。"
    / "Good match for your skill level — worth a shot."
  eval_challenging: "这个任务有些挑战，但我觉得你可以试试！"
    / "A bit challenging, but I believe you can handle it!"
  eval_locked: "抱歉主人，你的段位还不够接这个任务…再练练就好了！"
    / "Sorry master, your rank isn't high enough for this quest yet… keep training!"
```

### 9.2 现有 key 修改

原有涉及"活动""嘉宾""组织者""报名""邀请"的 key 值需全部替换为对应的悬赏世界观文案。具体 key 列表在实现阶段逐文件核对。

### 9.3 Server Action 中硬编码中文的处理

当前 `registrations/actions.ts` 等文件中存在硬编码中文错误消息（如 `'只有嘉宾可以报名活动'`）。本轮需要：
1. 将这些硬编码中文迁移到 `messages/*.json` 走 i18n
2. 同时将术语替换为悬赏世界观用语（如"报名活动" → "接单"）

这样既完成了换皮，也消除了一批已有技术债。

---

## 11. 迭代路线图

```
MVP（当前目标）
├─ 世界观术语全站替换（中英文）
├─ 猎人段位体系（6 级，人工管理）
├─ 悬赏任务分级（最低段位门槛，向上开放）
├─ 段位门槛校验（接单时校验）
├─ 小精灵：悬赏侦察 + 接单评估
├─ 任务卡片段位徽章
├─ 管理后台：/admin/hunters 段位管理
└─ 段位不足时的 UI 反馈（灰掉+锁图标+提示）

V2 - 小精灵进化
├─ 小精灵人格/外观自定义
├─ 悬赏人的小精灵（主动寻找猎人 → 确认后发起指名委托）
├─ Agent 间对话：双方小精灵互评沟通
├─ 段位顾问：小精灵建议晋升路径
└─ 指名委托由悬赏人小精灵发起

V3 - 自动运营
├─ Agent 自动评估段位晋升
├─ 积分/经验值系统
├─ 任务完成后自动评价流程
├─ 段位升降机制
└─ 悬赏任务难度自动定级

V4 - 生态扩展
├─ 猎人排行榜/赛季机制
├─ 悬赏赏金（真实支付）
├─ 公会/团队接单
└─ 小精灵成长体系
```

---

## 12. 涉及文件汇总

### 必须修改的文件

| 文件 | 改动类型 |
|------|---------|
| `src/types/database.ts` | 新增 `HunterLevel`、`BountyRank` 类型，修改 `Profile`、`Event` 接口 |
| `src/app/[locale]/page.tsx` | 首页改为悬赏大厅，接入小精灵气泡 |
| `src/app/[locale]/events/[id]/page.tsx` | 详情页新增小精灵评估卡片，段位不足禁用接单 |
| `src/app/[locale]/events/new/page.tsx` | 新增"最低接单段位"字段 |
| `src/app/[locale]/events/actions.ts` | `createEvent()` 和 `updateEvent()` 读取 `bounty_rank`；`parseEventFormData()` 扩展 |
| `src/app/[locale]/registrations/actions.ts` | `applyToEvent()` 新增段位校验，扩展 profile/event select 字段 |
| `src/app/[locale]/profile/page.tsx` | 新增段位徽章展示 |
| `src/app/[locale]/my-events/page.tsx` | 标题按角色区分 |
| `src/components/layout/navbar.tsx` | 导航文案替换 |
| `src/components/features/event-card.tsx` | 新增段位徽章 + 锁定态 |
| `src/lib/ai/mock-recommendation.ts` | 推荐理由改为小精灵口吻 |
| `src/lib/ai/recommendation.ts` | `getEventRecommendations()` 调用前新增段位过滤 |
| `src/lib/ai/pipeline/types.ts` | `EventDetailInput` 扩展 `bounty_rank` 字段 |
| `src/middleware.ts` | 新增 `/admin` 路径保护 |
| `messages/zh.json` | 全站中文文案替换 + 新增 key |
| `messages/en.json` | 全站英文文案替换 + 新增 key |

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/components/features/sprite-bubble.tsx` | 小精灵气泡组件 |
| `src/components/features/rank-badge.tsx` | 段位徽章组件 |
| `src/lib/admin.ts` | 管理员白名单校验 |
| `src/app/[locale]/admin/hunters/page.tsx` | 管理后台页面 |
| `src/app/[locale]/admin/actions.ts` | 管理后台 Server Action |

### Supabase Migration

```sql
-- 新增猎人段位字段
ALTER TABLE profiles
  ADD COLUMN hunter_level integer NOT NULL DEFAULT 1;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_hunter_level_check
  CHECK (hunter_level >= 1 AND hunter_level <= 6);

-- 新增悬赏任务难度字段
ALTER TABLE events
  ADD COLUMN bounty_rank integer NOT NULL DEFAULT 1;
ALTER TABLE events
  ADD CONSTRAINT events_bounty_rank_check
  CHECK (bounty_rank >= 1 AND bounty_rank <= 5);
```

---

## 13. 非目标（明确排除）

- Agent 间对话/谈判系统
- 自动段位晋升算法
- 积分/经验值系统
- 小精灵人格/外观自定义
- 悬赏赏金（真实支付）
- 猎人排行榜
- 公会/团队机制
- 管理后台的完整 RBAC（用硬编码白名单代替）

---

## 14. 验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 新注册猎人自动获得青铜段位 | 注册新用户，检查 `profiles.hunter_level = 1` |
| 2 | 悬赏人发布任务时可选择最低接单段位 | 发布页表单包含段位选择器，提交后数据库记录正确 |
| 3 | 段位不足时接单被拦截 | 青铜猎人尝试接黄金任务，看到"段位不足"提示 |
| 4 | 段位不足时卡片显示锁定态 | 青铜猎人在首页看到黄金任务卡片半透明+锁图标 |
| 5 | 首页显示小精灵侦察气泡 | 猎人登录后首页顶部出现小精灵推荐消息 |
| 6 | 详情页显示小精灵评估 | 猎人查看任务详情时看到段位匹配评估文案 |
| 7 | 全站中文术语已替换 | 所有"活动""嘉宾""组织者"改为悬赏世界观用语 |
| 8 | 全站英文术语已替换 | 英文版同步替换 |
| 9 | 管理员可修改猎人段位 | 白名单用户访问 `/admin/hunters`，修改段位后生效 |
| 10 | 非管理员无法访问管理页 | 普通用户访问 `/admin` 返回 403 或重定向 |
| 11 | 传说段位不出现在发布页选项中 | 发布悬赏时段位选择器只有青铜→钻石 |
| 12 | 指名委托不校验段位 | 悬赏人可以向任意段位猎人发起指名委托 |
