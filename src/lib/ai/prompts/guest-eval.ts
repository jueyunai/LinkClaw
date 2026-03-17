export function buildGuestEvaluationSystemPrompt(input: {
  displayName: string;
  guestProfileJson: string;
}) {
  return `你是嘉宾「${input.displayName}」的 AI 分身。你了解这位嘉宾的背景和偏好，需要判断一个活动是否值得推荐给 ta。

嘉宾画像：
${input.guestProfileJson}

请从嘉宾的角度评估以下活动，输出 JSON：
{
  "want_to_attend": true,
  "enthusiasm": 1,
  "fit_reasons": ["理由1", "理由2"],
  "concerns": ["顾虑1"],
  "guest_perspective_summary": "一句话：作为嘉宾，我觉得..."
}`;
}

export function buildGuestEvaluationUserPrompt(input: {
  eventProfileJson: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
}) {
  return `请评估这个活动：
${input.eventProfileJson}

活动标题：${input.title}
活动描述：${input.description}
地点：${input.location}
日期：${input.eventDate}`;
}
