export function buildEventProfilePrompt(input: {
  title: string;
  description: string;
  targetAudience: string | null;
  location: string;
  eventDate: string;
}) {
  return `你是 LinkClaw 平台的活动分析师。根据以下活动信息，提取结构化需求画像。

活动信息：
- 标题：${input.title}
- 描述：${input.description}
- 目标受众：${input.targetAudience ?? '未填写'}
- 地点：${input.location}
- 日期：${input.eventDate}

请输出 JSON：
{
  "topic_tags": ["标签1", "标签2"],
  "ideal_guest_tags": ["标签1", "标签2"],
  "seniority_preference": "any|junior|mid|senior|executive",
  "scope": "local|regional|national|international",
  "event_type": "conference|workshop|meetup|networking|other",
  "event_summary": "一句话活动摘要"
}

仅输出 JSON，不要其他内容。`;
}
