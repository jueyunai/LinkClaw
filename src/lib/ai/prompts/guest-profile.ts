export function buildGuestProfilePrompt(input: {
  displayName: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
}) {
  return `你是 LinkClaw 平台的画像分析师。根据以下嘉宾资料，提取结构化画像。

嘉宾资料：
- 名称：${input.displayName}
- 简介：${input.bio ?? '未填写'}
- 行业：${input.industry ?? '未填写'}
- 城市：${input.city ?? '未填写'}

请输出 JSON：
{
  "expertise_tags": ["标签1", "标签2"],
  "interest_tags": ["标签1", "标签2"],
  "seniority": "junior|mid|senior|executive",
  "location_preference": "local|regional|national|international",
  "networking_goals": ["学习", "合作"],
  "profile_summary": "一句话画像摘要"
}

仅输出 JSON，不要其他内容。`;
}
