# LinkClaw 产品设计文档

> AI 活动智能匹配平台 — MVP 版
> 日期：2026-03-09

## 1. 产品定位

LinkClaw 是一个双边平台，连接**活动主办方**和**嘉宾**，通过 LLM 语义匹配实现人与活动的双向智能推荐。

**聚焦行业**：AI、科技、新媒体等新兴行业

**核心价值**：
- 嘉宾：从海量活动中找到最值得参加的，附带 AI 推荐理由
- 主办方：精准触达目标嘉宾，提升活动质量

**商业模式**：Freemium

## 2. 用户角色与流程

### 主办方（Organizer）
注册 → 填写组织信息 → 发布活动 → 收到 AI 推荐的嘉宾名单 → 审核/邀请嘉宾 → 管理活动

### 嘉宾（Guest）
注册 → 填写个人画像（自然语言描述背景+兴趣） → 收到 AI 推荐的活动列表 → 浏览/报名 → 参加活动

## 3. MVP 核心功能

| # | 功能 | 描述 |
|---|------|------|
| 1 | 用户注册/画像 | 分角色注册，嘉宾用自然语言描述自己（行业、兴趣、期望） |
| 2 | 活动发布 | 主办方发布活动：标题、描述、时间、地点、人数上限、目标嘉宾画像 |
| 3 | AI 推荐 - 嘉宾侧 | 根据嘉宾画像推荐匹配活动 + 推荐理由 |
| 4 | AI 推荐 - 主办方侧 | 根据活动目标画像推荐匹配嘉宾 + 匹配度说明 |
| 5 | 报名/邀请 | 嘉宾可报名活动，主办方可邀请嘉宾，双向确认 |
| 6 | 活动管理 | 查看已报名/已邀请/已确认的状态面板 |

### 不做的功能
- 支付/票务
- 活动后社交/人脉报告
- 即时通讯/聊天
- 评价系统

## 4. 技术架构

```
┌─────────────────────────────────────────────┐
│              前端 (Next.js)                   │
│   活动列表 / 个人画像 / AI推荐 / 管理面板      │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│              后端 (Next.js API Routes)        │
│   认证 / 活动CRUD / 报名邀请 / AI推荐服务      │
└──────┬───────────┬──────────────────────────┘
       │           │
┌──────▼───┐ ┌─────▼──────┐
│ PostgreSQL│ │ Claude API │
│ (Supabase)│ │ (语义匹配)  │
└──────────┘ └────────────┘
```

### 技术栈

| 层 | 技术 | 理由 |
|---|------|------|
| 前端 | Next.js 15 + React | SSR/SSG 支持，全栈一体 |
| 样式 | Tailwind CSS + shadcn/ui | 开发快，组件质量高 |
| 后端 | Next.js API Routes | MVP 无需分离后端 |
| 数据库 | Supabase (PostgreSQL) | 免费额度够 MVP，自带认证 |
| 认证 | Supabase Auth | 支持邮箱/手机/第三方登录 |
| AI | Claude API (Sonnet) | 语义理解强，成本适中 |
| 部署 | Vercel | Next.js 原生支持，自动 CI/CD |

## 5. 数据模型

### profiles（用户画像）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, FK → auth.users | 主键 |
| role | enum: organizer / guest | 用户角色 |
| display_name | string | 显示名称 |
| bio | text | 自然语言描述（AI匹配核心输入） |
| industry | string | 行业标签 |
| city | string | 所在城市 |
| avatar_url | string | 头像 |
| created_at / updated_at | timestamp | 时间戳 |

### events（活动）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organizer_id | FK → profiles | 主办方 |
| title | string | 活动标题 |
| description | text | 活动详细描述 |
| target_audience | text | 目标嘉宾画像（自然语言） |
| event_date | timestamp | 活动时间 |
| location | string | 活动地点 |
| max_guests | int | 人数上限 |
| status | enum: draft / published / closed | 活动状态 |
| created_at / updated_at | timestamp | 时间戳 |

### registrations（报名/邀请）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| event_id | FK → events | 关联活动 |
| guest_id | FK → profiles | 关联嘉宾 |
| type | enum: applied / invited | 嘉宾报名 or 主办方邀请 |
| status | enum: pending / accepted / rejected | 状态 |
| ai_match_reason | text | AI 生成的匹配理由 |
| created_at / updated_at | timestamp | 时间戳 |

### ai_recommendations（AI推荐缓存）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| target_type | enum: guest / event | 推荐对象类型 |
| target_id | UUID | 推荐对象 ID |
| recommended_id | UUID | 被推荐对象 ID |
| match_score | float | 匹配分数 |
| match_reason | text | 匹配理由 |
| expires_at | timestamp | 缓存过期时间 |
| created_at | timestamp | 创建时间 |

## 6. AI 推荐流程

### 嘉宾侧 — "为你推荐的活动"

1. 嘉宾打开首页
2. 检查 `ai_recommendations` 缓存（是否过期）
3. 若无缓存/已过期：
   - 收集嘉宾 bio + industry + city
   - 获取近期 published 的活动列表
   - 获取嘉宾历史报名记录
   - 调用 Claude API，要求返回 JSON `[{id, score, reason}]`
   - 写入缓存表
4. 展示推荐活动卡片 + 推荐理由

### 主办方侧 — "推荐嘉宾"
方向相反：输入活动描述 + 目标画像，输出匹配嘉宾列表 + 理由

### Prompt 设计要点
- 结构化输出：返回 JSON 格式
- 推荐理由：每条 1-2 句自然语言
- 控制数量：Top 5-10
- 缓存策略：6 小时过期，新活动发布触发刷新

### 成本控制
- Sonnet 单次调用约 $0.003-0.01
- 缓存 6 小时 = 嘉宾每天最多 4 次 API 调用
- MVP 100 用户 × 4 次/天 ≈ $4-12/天

## 7. 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页/活动发现 | `/` | 嘉宾看 AI 推荐活动；主办方看活动管理入口 |
| 登录/注册 | `/auth` | Supabase Auth |
| 个人画像 | `/profile` | 填写/编辑画像信息 |
| 活动详情 | `/events/[id]` | 活动信息 + 报名按钮 + AI 匹配理由 |
| 发布活动 | `/events/new` | 主办方发布新活动 |
| 活动管理 | `/events/[id]/manage` | 报名列表 + AI 推荐嘉宾 |
| 我的活动 | `/my-events` | 嘉宾已报名 / 主办方已发布 |

## 8. Freemium 划分

| 功能 | 免费版 | Pro 版 |
|------|--------|--------|
| 浏览活动 | 无限 | 无限 |
| AI 推荐活动（嘉宾） | 每天 3 次刷新 | 无限 |
| 发布活动（主办方） | 每月 2 场 | 无限 |
| AI 推荐嘉宾（主办方） | Top 3 | Top 10 + 匹配度分数 |
| 报名/邀请 | 正常使用 | 正常使用 |
| 数据看板 | 不提供 | 活动热度/报名转化率 |

## 9. 错误处理

- **AI 调用失败**：降级为按标签（industry + city）排序展示，显示"AI 推荐暂时不可用"
- **注册未填画像**：引导到画像编辑页，不阻塞浏览
- **活动已满**：显示"已满员"，提供"候补"选项

## 10. 成功指标（MVP 验证）

- 主办方发布 → 嘉宾报名的转化率 > 15%
- AI 推荐活动的点击率 > 30%
- 用户 7 日留存 > 20%
