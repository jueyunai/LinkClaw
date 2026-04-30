# AI 推荐系统激活指引

> 日期：2026-04-30
> 用途：将 AI 推荐从 mock 模式切换到真实 LLM 推荐

## 当前状态

AI 推荐 Pipeline 已完整实现，包括：

- **Profile Extractor**：从用户画像和活动描述中提取结构化标签
- **Guest Agent**：从嘉宾视角评估活动匹配度
- **Activity Agent**：从活动视角评估嘉宾匹配度
- **Matchmaker**：综合双方评估生成最终匹配分数和理由
- **缓存层**：Profile 缓存 72h，推荐结果缓存 24h

当前默认 `AI_RECOMMENDATION_PROVIDER=mock`，使用基于关键词交集的简单排序。

## 激活步骤

### 1. 选择 AI 提供商

推荐使用 OpenAI 兼容 API（成本最低）：

| 提供商 | 推荐模型 | 单次推荐成本 | 说明 |
|--------|---------|-------------|------|
| OpenAI | gpt-4o-mini | ~$0.003 | 性价比最高，推荐 MVP 使用 |
| DeepSeek | deepseek-chat | ~$0.001 | 更便宜，中文理解好 |
| Anthropic | claude-3-haiku | ~$0.005 | 需要设置 API format |
| 自建/代理 | 任意 OpenAI 兼容 | 取决于部署 | 需要提供 base URL |

### 2. 配置环境变量

在 `.env.local` 中添加：

```bash
# 切换到远程 AI 推荐
AI_RECOMMENDATION_PROVIDER=remote

# API 连接（以 OpenAI 为例）
AI_RECOMMENDATION_BASE_URL=https://api.openai.com
AI_RECOMMENDATION_API_KEY=sk-your-api-key-here
AI_RECOMMENDATION_MODEL_ID=gpt-4o-mini

# 可选：使用不同模型做 profile 提取（更快）和匹配评估（更强）
# AI_RECOMMENDATION_MODEL_FAST=gpt-4o-mini
# AI_RECOMMENDATION_MODEL_STRONG=gpt-4o

# 可选：API 格式（默认 openai）
# AI_RECOMMENDATION_API_FORMAT=openai

# 可选：调优参数
# AI_RECOMMENDATION_TEMPERATURE=0.4
# AI_RECOMMENDATION_MAX_TOKENS=800
# AI_RECOMMENDATION_DEFAULT_LIMIT=3
# AI_PIPELINE_MAX_CANDIDATES=5
```

### 使用 DeepSeek

```bash
AI_RECOMMENDATION_PROVIDER=remote
AI_RECOMMENDATION_BASE_URL=https://api.deepseek.com
AI_RECOMMENDATION_API_KEY=sk-your-deepseek-key
AI_RECOMMENDATION_MODEL_ID=deepseek-chat
```

### 使用 Anthropic

```bash
AI_RECOMMENDATION_PROVIDER=remote
AI_RECOMMENDATION_API_FORMAT=anthropic
AI_RECOMMENDATION_BASE_URL=https://api.anthropic.com
AI_RECOMMENDATION_API_KEY=sk-ant-your-key
AI_RECOMMENDATION_MODEL_ID=claude-3-haiku-20240307
AI_RECOMMENDATION_API_KEY_HEADER=x-api-key
```

### 3. 验证

1. 重启开发服务器
2. 以嘉宾身份登录（确保已填写 bio/industry/city）
3. 访问首页，观察推荐卡片
4. 推荐标签应从 "模拟侦察" 变为 "实时侦察"
5. 推荐理由应为 AI 生成的自然语言（而非模板拼接）

### 4. 成本估算

以 gpt-4o-mini 为例：

- 每次推荐涉及 3 个 API 调用（profile 提取 + 双向评估 + 匹配）
- 单次推荐约 $0.003-0.01
- 缓存 24h = 每用户每天最多 1 次 API 调用
- 100 用户 × 1 次/天 ≈ $0.3-1/天

### 5. 降级策略

如果 AI 调用失败（网络超时、API 限流等），系统会自动降级到 mock 推荐，页面仍然可用。控制台会打印 `[AI Recommendation] 降级到 mock 推荐` 日志。

## 缓存管理

- Profile 缓存：`ai_profiles` 表，默认 72h 过期
- 推荐缓存：`ai_recommendations` 表，默认 24h 过期
- 修改缓存时间：`AI_PIPELINE_CACHE_TTL_HOURS` 和 `AI_PROFILE_CACHE_TTL_HOURS`
- 清除缓存：直接在 Supabase Dashboard 中清空对应表的过期记录

## 相关文件

| 文件 | 用途 |
|------|------|
| `src/lib/ai/config.ts` | AI 配置读取 |
| `src/lib/ai/recommendation.ts` | 推荐入口，缓存逻辑 |
| `src/lib/ai/pipeline/run-match-pipeline.ts` | Pipeline 编排 |
| `src/lib/ai/pipeline/profile-extractor.ts` | Profile 提取 |
| `src/lib/ai/pipeline/guest-agent.ts` | 嘉宾视角评估 |
| `src/lib/ai/pipeline/activity-agent.ts` | 活动视角评估 |
| `src/lib/ai/pipeline/matchmaker.ts` | 匹配评分 |
| `src/lib/ai/openai-client.ts` | OpenAI 兼容 HTTP 客户端 |
