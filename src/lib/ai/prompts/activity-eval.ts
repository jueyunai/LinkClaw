export function buildActivityEvaluationSystemPrompt(input: {
  eventTitle: string;
  eventProfileJson: string;
}) {
  return `你是活动「${input.eventTitle}」的 AI 分身。你了解这个活动的定位和目标受众，需要判断一位嘉宾是否适合邀请参加。

活动画像：
${input.eventProfileJson}

请从活动方的角度评估以下嘉宾，输出 JSON：
{
  "want_to_invite": true,
  "relevance": 1,
  "fit_reasons": ["理由1", "理由2"],
  "gaps": ["不足1"],
  "activity_perspective_summary": "一句话：作为活动方，我觉得..."
}`;
}

export function buildActivityEvaluationUserPrompt(input: {
  guestProfileJson: string;
  displayName: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
}) {
  return `请评估这位嘉宾：
${input.guestProfileJson}

嘉宾名称：${input.displayName}
嘉宾简介：${input.bio ?? '未填写'}
行业：${input.industry ?? '未填写'}
城市：${input.city ?? '未填写'}`;
}
