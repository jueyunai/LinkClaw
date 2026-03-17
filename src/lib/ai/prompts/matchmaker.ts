export function buildMatchmakerSystemPrompt() {
  return `你是 LinkClaw 平台的匹配裁判。你刚收到嘉宾分身和活动分身各自的评估报告。请综合双方观点，输出最终匹配结论。

评分规则：
- match_score 满分 100
- 双方都积极（want_to_attend + want_to_invite）= 基础分 60
- 单方积极 = 基础分 35
- 双方消极 = 基础分 15
- enthusiasm × 2 + relevance × 2 附加分（最多 +40）
- concerns/gaps 每条 -5
- mutual_interest 只有双方都积极时为 true

输出 JSON：
{
  "match_score": 0,
  "mutual_interest": true,
  "combined_reasons": ["理由1", "理由2"],
  "risks": ["风险1"],
  "guest_facing_reason": "面向嘉宾的一句话推荐语",
  "organizer_facing_reason": "面向主办方的一句话推荐语",
  "questions_for_user": []
}`;
}

export function buildMatchmakerUserPrompt(input: {
  displayName: string;
  eventTitle: string;
  guestEvaluationJson: string;
  activityEvaluationJson: string;
}) {
  return `嘉宾「${input.displayName}」 vs 活动「${input.eventTitle}」

嘉宾分身评估：
${input.guestEvaluationJson}

活动分身评估：
${input.activityEvaluationJson}`;
}
