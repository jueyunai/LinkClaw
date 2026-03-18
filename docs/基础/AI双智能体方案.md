# LinkClaw 双智能体推荐系统 V2 方案

> 基于 V1 策划（借鉴 OpenClaw），确认方向后的可落地实施方案。
>
> 决策确认：
> - **架构模式**：结构化多步 Pipeline（非自由对话）
> - **交互效果**：双方 Agent 互选——嘉宾分身与活动分身各自评估、交叉验证，输出双向匹配结论
> - **LLM 选型**：OpenAI API（GPT-4o / GPT-4o-mini）

---

## 1. 核心理念：Pipeline 式的"分身互选"

### 1.1 为什么是 Pipeline 而非自由对话

| 维度 | 自由对话 | Pipeline（本方案） |
|------|---------|-------------------|
| 可控性 | 低，可能发散 | 高，每步输入输出固定 |
| 延迟 | 不可预测 | 可预测（3-5 步，每步 <2s） |
| 成本 | 不可控 | 可精确预估 |
| 输出质量 | 依赖对话引导 | 结构化 JSON，可校验 |
| 用户体验 | 等待久 | 可流式展示每步结果 |

### 1.2 "互选"效果如何通过 Pipeline 实现

核心思路：**不是两个 Agent 在真正聊天，而是各自独立评估后交叉验证**。

```
┌─────────────────────────────────────────────────────────────┐
│                    匹配 Pipeline 总览                         │
│                                                             │
│  Step 1: 画像抽取                                            │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │ 嘉宾 Profile  │    │ 活动 Detail   │                       │
│  │  → 结构化画像  │    │  → 结构化需求  │                       │
│  └──────┬───────┘    └──────┬───────┘                       │
│         │                   │                               │
│  Step 2: 双向独立评估                                         │
│         ▼                   ▼                               │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │ Guest Agent   │    │ Activity Agent│                      │
│  │ "这活动适合我  │    │ "这嘉宾适合我  │                      │
│  │  吗？"        │    │  的活动吗？"   │                      │
│  │  → 评估报告   │    │  → 评估报告    │                      │
│  └──────┬───────┘    └──────┬───────┘                       │
│         │                   │                               │
│  Step 3: 交叉验证 & 综合评分                                   │
│         ▼                   ▼                               │
│  ┌──────────────────────────────────┐                       │
│  │        Matchmaker（裁判）          │                       │
│  │  综合双方评估 → 最终 match_score   │                       │
│  │  + fit_reasons + risks + 推荐语   │                       │
│  └──────────────────────────────────┘                       │
│                                                             │
│  Step 4（可选）: 补充提问                                      │
│  如果信息不足 → 生成 questions_for_user                        │
└─────────────────────────────────────────────────────────────┘
```

用户看到的效果：**"你的分身觉得这个活动很适合你，而活动方也认为你是理想嘉宾"**——这就是"互选"。

---

## 2. Pipeline 四步详细设计

### Step 1: 画像抽取（Profile Extraction）

**目的**：将非结构化的 profile/event 文本转为结构化标签，供后续评估使用。

**触发时机**：profile 或 event 创建/更新时异步执行，结果缓存。

**输入**：
```typescript
// 嘉宾侧
interface GuestProfileInput {
  display_name: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
  // 未来扩展：interests, past_registrations
}

// 活动侧
interface EventDetailInput {
  title: string;
  description: string;
  target_audience: string | null;
  location: string;
  event_date: string;
  // 未来扩展：organizer_bio, past_events
}
```

**OpenAI 调用**：
```
模型：gpt-4o-mini（成本低，抽取任务足够）
Temperature：0.1
Max tokens：400
```

**Prompt 模板（嘉宾侧）**：
```
你是 LinkClaw 平台的画像分析师。根据以下嘉宾资料，提取结构化画像。

嘉宾资料：
- 名称：{{display_name}}
- 简介：{{bio}}
- 行业：{{industry}}
- 城市：{{city}}

请输出 JSON：
{
  "expertise_tags": ["标签1", "标签2", ...],   // 3-8 个专业领域标签
  "interest_tags": ["标签1", "标签2", ...],    // 3-8 个兴趣偏好标签
  "seniority": "junior|mid|senior|executive",  // 资历层级
  "location_preference": "local|regional|national|international",
  "networking_goals": ["学习", "合作", "社交", ...],  // 1-4 个社交目标
  "profile_summary": "一句话画像摘要"
}

仅输出 JSON，不要其他内容。
```

**Prompt 模板（活动侧）**：
```
你是 LinkClaw 平台的活动分析师。根据以下活动信息，提取结构化需求画像。

活动信息：
- 标题：{{title}}
- 描述：{{description}}
- 目标受众：{{target_audience}}
- 地点：{{location}}
- 日期：{{event_date}}

请输出 JSON：
{
  "topic_tags": ["标签1", "标签2", ...],        // 3-8 个主题标签
  "ideal_guest_tags": ["标签1", "标签2", ...],  // 3-8 个理想嘉宾特征
  "seniority_preference": "any|junior|mid|senior|executive",
  "scope": "local|regional|national|international",
  "event_type": "conference|workshop|meetup|networking|other",
  "event_summary": "一句话活动摘要"
}

仅输出 JSON，不要其他内容。
```

**输出结构**：
```typescript
interface GuestProfile {
  expertise_tags: string[];
  interest_tags: string[];
  seniority: 'junior' | 'mid' | 'senior' | 'executive';
  location_preference: 'local' | 'regional' | 'national' | 'international';
  networking_goals: string[];
  profile_summary: string;
}

interface EventProfile {
  topic_tags: string[];
  ideal_guest_tags: string[];
  seniority_preference: 'any' | 'junior' | 'mid' | 'senior' | 'executive';
  scope: 'local' | 'regional' | 'national' | 'international';
  event_type: 'conference' | 'workshop' | 'meetup' | 'networking' | 'other';
  event_summary: string;
}
```

---

### Step 2: 双向独立评估（Bilateral Evaluation）

**目的**：嘉宾分身和活动分身各自独立评估匹配度——这是"互选"的核心。

**两次调用可并行执行**，降低总延迟。

**模型**：`gpt-4o-mini`（结构化评估任务）
**Temperature**：`0.3`
**Max tokens**：`500`

#### 2a. Guest Agent 评估（"这个活动适合我吗？"）

**System Prompt**：
```
你是嘉宾「{{display_name}}」的 AI 分身。你了解这位嘉宾的背景和偏好，
需要判断一个活动是否值得推荐给 ta。

嘉宾画像：
{{guest_profile_json}}

请从嘉宾的角度评估以下活动，输出 JSON：
{
  "want_to_attend": true/false,        // 这位嘉宾是否想参加
  "enthusiasm": 1-10,                  // 期待程度
  "fit_reasons": ["理由1", "理由2"],    // 1-3 条适合的理由（嘉宾视角）
  "concerns": ["顾虑1"],               // 0-2 条顾虑
  "guest_perspective_summary": "一句话：作为嘉宾，我觉得..."
}
```

**User Message**：
```
请评估这个活动：
{{event_profile_json}}

活动标题：{{event.title}}
活动描述：{{event.description}}
地点：{{event.location}}
日期：{{event.event_date}}
```

#### 2b. Activity Agent 评估（"这个嘉宾适合我的活动吗？"）

**System Prompt**：
```
你是活动「{{event.title}}」的 AI 分身。你了解这个活动的定位和目标受众，
需要判断一位嘉宾是否适合邀请参加。

活动画像：
{{event_profile_json}}

请从活动方的角度评估以下嘉宾，输出 JSON：
{
  "want_to_invite": true/false,         // 是否想邀请这位嘉宾
  "relevance": 1-10,                    // 匹配度
  "fit_reasons": ["理由1", "理由2"],     // 1-3 条适合的理由（活动方视角）
  "gaps": ["不足1"],                     // 0-2 条不匹配点
  "activity_perspective_summary": "一句话：作为活动方，我觉得..."
}
```

**User Message**：
```
请评估这位嘉宾：
{{guest_profile_json}}

嘉宾名称：{{profile.display_name}}
嘉宾简介：{{profile.bio}}
行业：{{profile.industry}}
城市：{{profile.city}}
```

**输出结构**：
```typescript
interface GuestEvaluation {
  want_to_attend: boolean;
  enthusiasm: number;        // 1-10
  fit_reasons: string[];
  concerns: string[];
  guest_perspective_summary: string;
}

interface ActivityEvaluation {
  want_to_invite: boolean;
  relevance: number;         // 1-10
  fit_reasons: string[];
  gaps: string[];
  activity_perspective_summary: string;
}
```

---

### Step 3: 交叉验证 & 综合评分（Matchmaker）

**目的**：综合双方评估，输出最终匹配结论和面向用户的推荐理由。

**模型**：`gpt-4o`（综合判断用更强模型）
**Temperature**：`0.4`
**Max tokens**：`600`

**System Prompt**：
```
你是 LinkClaw 平台的匹配裁判。你刚收到嘉宾分身和活动分身各自的评估报告。
请综合双方观点，输出最终匹配结论。

评分规则：
- match_score 满分 100，计算公式参考：
  - 双方都积极（want_to_attend + want_to_invite）= 基础分 60
  - 单方积极 = 基础分 35
  - 双方消极 = 基础分 15
  - enthusiasm × 2 + relevance × 2 附加分（最多 +40）
  - 有 concerns/gaps 每条 -5

- mutual_interest 只有双方都积极时为 true

输出 JSON：
{
  "match_score": 0-100,
  "mutual_interest": true/false,
  "combined_reasons": ["理由1", "理由2", "理由3"],  // 综合双方的 2-3 条核心匹配点
  "risks": ["风险1"],                               // 0-2 条潜在风险
  "guest_facing_reason": "面向嘉宾的一句话推荐语",
  "organizer_facing_reason": "面向主办方的一句话推荐语",
  "questions_for_user": []                           // 需要用户补充的信息（通常为空）
}
```

**User Message**：
```
嘉宾「{{display_name}}」 vs 活动「{{event.title}}」

嘉宾分身评估：
{{guest_evaluation_json}}

活动分身评估：
{{activity_evaluation_json}}
```

**输出结构**：
```typescript
interface MatchResult {
  match_score: number;          // 0-100
  mutual_interest: boolean;     // 双方是否都积极
  combined_reasons: string[];   // 综合匹配理由
  risks: string[];              // 潜在风险
  guest_facing_reason: string;  // 面向嘉宾的推荐语
  organizer_facing_reason: string; // 面向主办方的推荐语
  questions_for_user: string[]; // 需补充信息
}
```

---

### Step 4（可选）: 补充提问

仅当 `questions_for_user` 非空时触发，MVP 阶段暂不实现。预留接口即可。

---

## 3. 完整数据流

### 3.1 嘉宾侧推荐流程

```
嘉宾访问首页
    │
    ▼
读取嘉宾 profile + 缓存的 guest_profile_json
    │
    ▼
查询候选活动（status=published, 排除已报名）
    │
    ▼
检查 ai_recommendations 缓存（未过期则直接返回）
    │
    ▼  缓存 miss
对每个候选活动执行 Pipeline：
    ├── Step 1: 活动画像抽取（如无缓存）
    ├── Step 2a: Guest Agent 评估 ─┐
    ├── Step 2b: Activity Agent 评估 ┘── 并行
    └── Step 3: Matchmaker 综合评分
    │
    ▼
按 match_score 排序，取 top-N
    │
    ▼
写入 ai_recommendations 表（TTL 24h）
    │
    ▼
返回给前端：match_score + guest_facing_reason
```

### 3.2 主办方侧推荐流程

```
主办方访问活动详情 → "推荐嘉宾"
    │
    ▼
读取活动 detail + 缓存的 event_profile_json
    │
    ▼
查询候选嘉宾（role=guest, 排除已邀请）
    │
    ▼
检查 ai_recommendations 缓存
    │
    ▼  缓存 miss
对每个候选嘉宾执行相同 Pipeline
    │
    ▼
按 match_score 排序，取 top-N
    │
    ▼
写入 ai_recommendations + 返回给前端
```

---

## 4. 与现有代码的集成

### 4.1 现有资产盘点

| 文件 | 现状 | V2 变化 |
|------|------|---------|
| `src/lib/ai/config.ts` | 已支持 OpenAI 格式、环境变量配置 | 新增画像/评估相关配置项 |
| `src/lib/ai/mock-recommendation.ts` | 规则匹配，首页消费 | 保留为 fallback，新增 LLM 推荐模块 |
| `src/types/database.ts` | 已有 `AiRecommendation` 类型 | 扩展字段 |
| `src/app/[locale]/page.tsx` | 消费 `MockRecommendation` 接口 | 适配新的输出接口 |

### 4.2 新增文件规划

```
src/lib/ai/
├── config.ts                       # [已有] 扩展配置
├── mock-recommendation.ts          # [已有] 保留为 fallback
├── mock-recommendation.test.ts     # [已有]
├── openai-client.ts                # [新增] OpenAI API 封装
├── pipeline/
│   ├── types.ts                    # [新增] Pipeline 全部类型定义
│   ├── profile-extractor.ts        # [新增] Step 1 画像抽取
│   ├── guest-agent.ts              # [新增] Step 2a 嘉宾分身评估
│   ├── activity-agent.ts           # [新增] Step 2b 活动分身评估
│   ├── matchmaker.ts               # [新增] Step 3 交叉验证
│   └── run-match-pipeline.ts       # [新增] Pipeline 编排入口
├── recommendation.ts               # [新增] 统一推荐入口（mock / pipeline 切换）
└── prompts/
    ├── guest-profile.txt           # [新增] 画像抽取 prompt 模板
    ├── event-profile.txt           # [新增] 活动画像 prompt 模板
    ├── guest-eval.txt              # [新增] 嘉宾评估 prompt 模板
    ├── activity-eval.txt           # [新增] 活动评估 prompt 模板
    └── matchmaker.txt              # [新增] 裁判 prompt 模板
```

### 4.3 输出接口兼容设计

为保持首页消费方式不变，新推荐模块的输出需要兼容现有 `MockRecommendation` 结构：

```typescript
// src/lib/ai/recommendation.ts

import type { MockRecommendation } from './mock-recommendation';

export interface AiMatchRecommendation {
  eventId: string;
  matchScore: number;               // 0-100，来自 Matchmaker
  mutualInterest: boolean;          // 双方互选
  guestFacingReason: string;        // LLM 生成的推荐语
  organizerFacingReason: string;    // 主办方侧推荐语
  combinedReasons: string[];        // 详细理由列表
  risks: string[];                  // 风险提示

  // 兼容字段——让首页无需大改即可渲染
  matchReasonKey: MockRecommendation['matchReasonKey'];
  matchReasonParams?: MockRecommendation['matchReasonParams'];
}

// 统一入口：根据 config.provider 切换 mock / pipeline
export async function getEventRecommendations(
  profile: GuestProfileInput,
  events: EventDetailInput[],
  limit?: number,
): Promise<AiMatchRecommendation[]> { ... }
```

### 4.4 数据库扩展

`ai_recommendations` 表现有字段基本够用，建议新增：

```sql
-- 新增字段
ALTER TABLE ai_recommendations
  ADD COLUMN mutual_interest BOOLEAN DEFAULT false,
  ADD COLUMN guest_evaluation JSONB,       -- 嘉宾分身评估原文
  ADD COLUMN activity_evaluation JSONB,    -- 活动分身评估原文
  ADD COLUMN pipeline_version TEXT;         -- 'v2.0' 便于回溯

-- 画像缓存表（新增）
CREATE TABLE ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('guest', 'event')),
  source_id UUID NOT NULL,
  profile_json JSONB NOT NULL,
  model_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (source_type, source_id)
);

-- 反馈表（新增）
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES ai_recommendations(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('click', 'apply', 'dismiss', 'invite_sent', 'invite_accepted', 'invite_rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

TypeScript 类型同步：
```typescript
// 新增到 src/types/database.ts
export interface AiProfile {
  id: string;
  source_type: 'guest' | 'event';
  source_id: string;
  profile_json: GuestProfile | EventProfile;
  model_id: string;
  created_at: string;
  expires_at: string;
}

export interface AiFeedback {
  id: string;
  recommendation_id: string;
  user_id: string;
  action: 'click' | 'apply' | 'dismiss' | 'invite_sent' | 'invite_accepted' | 'invite_rejected';
  created_at: string;
}
```

---

## 5. OpenAI 接入方案

### 5.1 模型选型

| Pipeline 步骤 | 模型 | 理由 |
|---------------|------|------|
| Step 1 画像抽取 | `gpt-4o-mini` | 简单抽取任务，成本优先 |
| Step 2 双向评估 | `gpt-4o-mini` | 结构化评估，mini 足够 |
| Step 3 Matchmaker | `gpt-4o` | 综合判断需要更强推理 |

### 5.2 环境变量（沿用现有 config.ts 风格）

```env
# 基础配置（沿用已有）
AI_RECOMMENDATION_PROVIDER=remote
AI_RECOMMENDATION_API_FORMAT=openai
AI_RECOMMENDATION_API_KEY=sk-xxx
AI_RECOMMENDATION_BASE_URL=https://api.openai.com/v1

# 新增：模型分级配置
AI_RECOMMENDATION_MODEL_FAST=gpt-4o-mini    # Step 1, 2
AI_RECOMMENDATION_MODEL_STRONG=gpt-4o       # Step 3

# 新增：Pipeline 配置
AI_PIPELINE_MAX_CANDIDATES=20               # 单次最多评估候选数
AI_PIPELINE_CACHE_TTL_HOURS=24              # 推荐缓存时长
AI_PROFILE_CACHE_TTL_HOURS=72              # 画像缓存时长
```

### 5.3 API 调用封装

```typescript
// src/lib/ai/openai-client.ts
// 轻量封装，不引入 SDK 依赖，直接 fetch

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAiJsonResponse<T> {
  data: T | null;
  error: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export async function chatJsonCompletion<T>(params: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenAiJsonResponse<T>> {
  // 使用 response_format: { type: "json_object" } 强制 JSON 输出
  // 超时、重试、错误处理
}
```

### 5.4 成本预估

单次完整推荐（1 嘉宾 × 1 活动）：

| 步骤 | 模型 | Input tokens | Output tokens | 成本（USD） |
|------|------|-------------|---------------|------------|
| Step 1a 嘉宾画像 | gpt-4o-mini | ~300 | ~200 | $0.00008 |
| Step 1b 活动画像 | gpt-4o-mini | ~400 | ~200 | $0.00009 |
| Step 2a Guest Agent | gpt-4o-mini | ~500 | ~300 | $0.00012 |
| Step 2b Activity Agent | gpt-4o-mini | ~500 | ~300 | $0.00012 |
| Step 3 Matchmaker | gpt-4o | ~800 | ~400 | $0.005 |
| **单次总计** | | | | **~$0.006** |

实际场景：1 嘉宾推荐 top-5 活动 = 约 **$0.03**（画像缓存后更低）

月成本预估（100 DAU × 每日 1 次推荐 × 5 候选）：
- 画像抽取（带缓存 72h）：可忽略
- 评估 + 匹配：100 × 5 × $0.006 × 30 = **$90/月**

**优化方向**：Step 3 也改用 gpt-4o-mini 可降至 **$20/月**，等验证效果后再决定。

---

## 6. 运行时约束与部署

### 6.1 Vercel Function 超时

| 方案 | Hobby Plan (10s) | Pro Plan (60s) |
|------|------------------|----------------|
| 单候选 Pipeline（~3s） | 可行 | 可行 |
| 5 候选串行（~15s） | 超时 | 可行 |
| 5 候选并行（~5s） | 超时边缘 | 可行 |

**MVP 策略**：
- Pro Plan：Server Action 内直接并行执行 5 候选，总耗时 ~5s
- Hobby Plan：改为异步——触发 Supabase Edge Function，结果写表，前端轮询

### 6.2 并行优化

```
时间线（5 个候选活动）：

串行：|--S1--|--S2a--|--S2b--|--S3--|--S1--|--S2a--|--S2b--|--S3--|...  = ~15s

并行优化后：
  Step 1: 画像抽取（有缓存通常跳过）
  Step 2: 5 个候选的 (2a, 2b) 全部并行 ────────── ~2s
  Step 3: 5 个 Matchmaker 并行 ─────────────────── ~2s
  总计：~4-5s
```

### 6.3 降级与容错

```typescript
// src/lib/ai/recommendation.ts 统一入口
export async function getEventRecommendations(...) {
  const config = getAiRecommendationConfig();

  // 1. 检查缓存
  const cached = await getCachedRecommendations(profile.id);
  if (cached) return cached;

  // 2. 尝试 Pipeline
  if (config.provider === 'remote' && config.apiKey) {
    try {
      return await runMatchPipeline(profile, events, limit);
    } catch (error) {
      console.error('[AI Pipeline] 降级到 mock', error);
    }
  }

  // 3. Fallback 到 mock
  return convertMockToAiFormat(getMockEventRecommendations(profile, events, limit));
}
```

---

## 7. 前端展示增强

### 7.1 嘉宾侧推荐卡片（升级）

现有渲染已有 `matchScore` + `matchReasonKey`，V2 新增：

```
┌─────────────────────────────────────┐
│  🤝 双向匹配 92%                     │  ← mutual_interest 为 true 时显示
│                                     │
│  你的分身觉得：                       │  ← guest_facing_reason
│  "这个 AI 技术沙龙与你的机器学习背景    │
│   高度相关，适合拓展行业人脉"          │
│                                     │
│  活动方也认为：                       │  ← organizer_facing_reason（可选展示）
│  "你的 AI 领域经验正是我们期望的嘉宾"  │
│                                     │
│  [查看活动详情]                       │
└─────────────────────────────────────┘
```

### 7.2 主办方侧推荐列表（新增页面）

在活动详情页新增"AI 推荐嘉宾"模块：

```
┌─────────────────────────────────────┐
│  推荐嘉宾                            │
│                                     │
│  1. 张三 — 匹配 95% 🤝              │
│     "AI 领域资深专家，与活动主题       │
│      高度契合"                        │
│     [邀请] [忽略]                     │
│                                     │
│  2. 李四 — 匹配 78%                  │
│     "有相关行业经验，地点匹配"         │
│     [邀请] [忽略]                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. 分阶段实施路线

### Phase 1：Pipeline MVP（替换 mock）

**目标**：首页嘉宾推荐接入 LLM Pipeline，保留 mock 作为 fallback。

**范围**：
1. `openai-client.ts` — OpenAI API 调用封装
2. `pipeline/types.ts` — 类型定义
3. `pipeline/profile-extractor.ts` — Step 1
4. `pipeline/guest-agent.ts` — Step 2a
5. `pipeline/activity-agent.ts` — Step 2b
6. `pipeline/matchmaker.ts` — Step 3
7. `pipeline/run-match-pipeline.ts` — 编排入口
8. `recommendation.ts` — 统一入口（mock / pipeline 切换）
9. 更新首页消费逻辑，展示 LLM 生成的推荐语
10. Supabase migration：`ai_profiles` 表、`ai_recommendations` 扩展字段

**预计工作量**：中等（主要是 prompt 调试与结果校验）

### Phase 2：主办方侧推荐

**目标**：活动详情页提供"AI 推荐嘉宾"功能。

**范围**：
1. 复用 Phase 1 的 Pipeline（方向反转即可）
2. 活动详情页新增推荐嘉宾 UI 模块
3. 邀请按钮对接现有 `registrations` 逻辑
4. `ai_feedback` 表 + 前端埋点

### Phase 3：缓存与性能优化

**目标**：降低 API 调用次数，提升响应速度。

**范围**：
1. 画像缓存（`ai_profiles` 表，TTL 72h）
2. 推荐结果缓存（`ai_recommendations` 表，TTL 24h）
3. 用户行为触发缓存失效（profile 更新、新活动发布）
4. 批量预计算热门活动的推荐结果（Supabase pg_cron）

### Phase 4：记忆与反馈闭环

**目标**：推荐质量持续提升。

**范围**：
1. `ai_feedback` 数据分析
2. 画像抽取时注入历史反馈（"该嘉宾过去偏好 XX 类型活动"）
3. 可选：pgvector 做语义相似度召回（替代/增强标签匹配）
4. 冷启动轻量问卷（新用户引导选择兴趣标签）

---

## 9. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| OpenAI API 不可用/超时 | 推荐功能瘫痪 | mock fallback + 缓存兜底 |
| LLM 输出非法 JSON | Pipeline 中断 | JSON Schema 校验 + 重试 1 次 + 降级 |
| 推荐理由质量不稳定 | 用户体验差 | prompt 迭代 + 温度调低 + 人工抽检 |
| 成本超预期 | 预算问题 | 监控 usage + 限频 + 优先用 mini |
| Vercel 超时 | 推荐无法返回 | 并行优化 + 异步方案备选 |
| 冷启动无数据 | 推荐不准 | 热门活动兜底 + 引导填写标签 |

---

## 10. 评估指标

### 10.1 业务指标

- **推荐点击率（CTR）**：推荐活动被点击 / 推荐展示次数
- **推荐转化率**：推荐活动被报名 / 推荐展示次数
- **互选率**：`mutual_interest=true` 的推荐占比
- **邀请接受率**：主办方发出邀请被接受 / 总邀请数

### 10.2 技术指标

- **Pipeline 成功率**：完整跑完 / 总触发次数（目标 >95%）
- **平均延迟**：Pipeline 端到端耗时（目标 <5s）
- **缓存命中率**：缓存命中 / 总请求（目标 >60%）
- **月 API 成本**：实际 vs 预估

---

## 11. 与 V1 方案的差异对照

| 维度 | V1 方案 | V2 方案 |
|------|---------|---------|
| LLM 选型 | 未指定 | OpenAI (gpt-4o / gpt-4o-mini) |
| 互聊机制 | 概念性"受控短对话" | 4 步 Pipeline + 并行评估 + 交叉验证 |
| Embedding | LanceDB（不适配 Vercel） | Phase 4 再引入 pgvector，MVP 用标签匹配 |
| Prompt 设计 | 无 | 5 套完整模板 |
| 成本预估 | "需限额" | 详细到每步 token + 月度预算 |
| 部署方案 | 未提及超时 | Vercel 超时分析 + 并行优化 + 异步备选 |
| 降级策略 | 无 | mock fallback + 缓存 + JSON 校验重试 |
| 输出接口 | 未定义 | 兼容现有 MockRecommendation + 扩展字段 |
| 评估指标 | 无 | CTR / 转化率 / 互选率 / 延迟 / 成本 |

---

## 12. 结论

V2 方案的核心创新是 **Pipeline 式的分身互选**：

1. 嘉宾分身和活动分身**各自独立评估**（Step 2 并行）
2. Matchmaker **交叉验证**双方观点，输出互选结论（Step 3）
3. 用户看到的是"你的分身觉得适合 + 活动方也认为你匹配"——**互选效果**

技术上：
- 每步输入输出严格定义，可测试、可验证
- 并行优化控制总延迟在 5 秒内
- mock fallback 确保服务可用性
- 成本可控（~$90/月 @ 100 DAU，可进一步优化至 $20/月）

建议从 **Phase 1** 开始实施：先让嘉宾侧推荐用上 LLM Pipeline，验证效果后再扩展到主办方侧。
