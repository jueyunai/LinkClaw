/**
 * Seed script: creates sample events for internal testing.
 *
 * Usage:
 *   npx tsx scripts/seed-events.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (admin key, NOT the anon key)
 *
 * The script creates events owned by a designated organizer account.
 * If the organizer doesn't exist yet, it prints instructions.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Seed events ──────────────────────────────────────────────

interface SeedEvent {
  title: string;
  description: string;
  target_audience: string;
  location: string;
  event_date: string;
  max_guests: number;
  bounty_rank: number;
  status: 'published';
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(14, 0, 0, 0);
  return d.toISOString();
}

const SEED_EVENTS: SeedEvent[] = [
  {
    title: 'AI 产品经理闭门会',
    description:
      '面向 AI 产品经理的深度交流会，聚焦大模型落地场景、产品设计方法论与用户增长策略。每位参与者需准备一个 5 分钟的案例分享。',
    target_audience:
      '有 2 年以上 AI 产品经验的产品经理，熟悉 LLM 应用场景，有实际落地案例优先。',
    location: '上海·静安区',
    event_date: futureDate(7),
    max_guests: 20,
    bounty_rank: 2,
    status: 'published',
  },
  {
    title: 'Web3 × AI Hackathon',
    description:
      '48 小时极限开发挑战，主题为"AI Agent + 链上交互"。提供 API 额度、导师指导和路演机会。优胜团队可获得种子轮对接。',
    target_audience:
      '全栈开发者、AI 工程师、智能合约开发者，有 Hackathon 经验者优先。',
    location: '深圳·南山区',
    event_date: futureDate(14),
    max_guests: 50,
    bounty_rank: 3,
    status: 'published',
  },
  {
    title: '新媒体创作者圆桌',
    description:
      '邀请 10 位头部新媒体创作者，围绕"AI 辅助内容生产"展开圆桌讨论。话题涵盖 AI 写作、视频脚本生成、数据驱动选题。',
    target_audience:
      '粉丝量 10 万以上的新媒体创作者，或在 AI 内容工具领域有深度使用经验的从业者。',
    location: '北京·朝阳区',
    event_date: futureDate(10),
    max_guests: 12,
    bounty_rank: 4,
    status: 'published',
  },
  {
    title: '独立开发者 Demo Day',
    description:
      '面向独立开发者的产品展示日。每人 10 分钟演示自己的 side project，现场投票选出最佳产品。提供投资人和媒体资源对接。',
    target_audience:
      '有已上线或即将上线产品的独立开发者，技术栈不限，重视产品完成度和用户价值。',
    location: '杭州·西湖区',
    event_date: futureDate(21),
    max_guests: 30,
    bounty_rank: 1,
    status: 'published',
  },
  {
    title: 'AI Infra 技术沙龙',
    description:
      '深入探讨 AI 基础设施：推理优化、模型部署、向量数据库选型、RAG 架构实践。适合关注 AI 工程化落地的技术人。',
    target_audience:
      'AI 工程师、MLOps 工程师、后端架构师，有大模型部署或 RAG 系统搭建经验。',
    location: '上海·浦东新区',
    event_date: futureDate(5),
    max_guests: 25,
    bounty_rank: 3,
    status: 'published',
  },
  {
    title: 'Design × AI Workshop',
    description:
      '设计师如何用 AI 提升工作效率？本次 Workshop 涵盖 AI 辅助 UI 设计、用户研究自动化、设计系统与 AI 的结合实践。',
    target_audience:
      'UI/UX 设计师、产品设计师，对 AI 工具有好奇心，愿意动手实践。',
    location: '成都·高新区',
    event_date: futureDate(12),
    max_guests: 15,
    bounty_rank: 1,
    status: 'published',
  },
  {
    title: '出海创业者私享会',
    description:
      '聚焦 AI 产品出海策略：海外市场选择、本地化运营、支付与合规、增长黑客。仅限已有出海经验或正在筹备出海的创业者。',
    target_audience:
      'AI 创业公司创始人或核心团队成员，有海外市场拓展经验或明确出海计划。',
    location: '线上 · Zoom',
    event_date: futureDate(3),
    max_guests: 20,
    bounty_rank: 5,
    status: 'published',
  },
  {
    title: 'LLM 安全与对齐研讨会',
    description:
      '探讨大语言模型的安全性、对齐技术、红队测试方法论。邀请学术界和工业界的研究者分享最新进展。',
    target_audience:
      'AI 安全研究员、对齐方向研究者、大模型团队技术负责人。',
    location: '北京·海淀区',
    event_date: futureDate(18),
    max_guests: 40,
    bounty_rank: 4,
    status: 'published',
  },
];

// ── Main ─────────────────────────────────────────────────────

async function main() {
  // Find an organizer to own the seed events
  const { data: organizers, error: orgError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'organizer')
    .limit(1);

  if (orgError) {
    console.error('❌ Failed to query organizers:', orgError.message);
    process.exit(1);
  }

  if (!organizers || organizers.length === 0) {
    console.error(
      '❌ No organizer found. Please register an organizer account first, then re-run this script.',
    );
    process.exit(1);
  }

  const organizer = organizers[0];
  console.log(`📌 Using organizer: ${organizer.display_name} (${organizer.id})`);

  // Check for existing seed events (avoid duplicates)
  const { data: existing } = await supabase
    .from('events')
    .select('title')
    .eq('organizer_id', organizer.id)
    .in(
      'title',
      SEED_EVENTS.map((e) => e.title),
    );

  const existingTitles = new Set((existing ?? []).map((e: { title: string }) => e.title));
  const newEvents = SEED_EVENTS.filter((e) => !existingTitles.has(e.title));

  if (newEvents.length === 0) {
    console.log('✅ All seed events already exist. Nothing to do.');
    return;
  }

  const inserts = newEvents.map((e) => ({
    ...e,
    organizer_id: organizer.id,
  }));

  const { error: insertError } = await supabase.from('events').insert(inserts as never);

  if (insertError) {
    console.error('❌ Failed to insert seed events:', insertError.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${newEvents.length} seed events:`);
  for (const e of newEvents) {
    console.log(`   • ${e.title} (rank ${e.bounty_rank})`);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
