/**
 * Email templates for key notification events.
 * Guild-themed, bilingual (zh/en), plain HTML — no template engine needed.
 */

const GUILD_COLORS = {
  gold: '#c8922a',
  mahogany: '#3d1f0a',
  parchment: '#f5ead6',
  ink: '#2a1a0a',
  lightGold: '#f0c060',
} as const;

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${GUILD_COLORS.parchment};font-family:Georgia,serif;">
  <div style="max-width:560px;margin:24px auto;background:#fdf8f0;border:1px solid rgba(200,146,42,0.3);border-radius:8px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${GUILD_COLORS.mahogany},#2e1508);padding:24px 32px;text-align:center;">
      <div style="color:${GUILD_COLORS.lightGold};font-size:24px;font-weight:bold;letter-spacing:2px;">LinkClaw</div>
      <div style="color:${GUILD_COLORS.gold};font-size:10px;text-transform:uppercase;letter-spacing:4px;margin-top:4px;">Guild Dispatch</div>
    </div>
    <!-- Body -->
    <div style="padding:32px;color:${GUILD_COLORS.ink};line-height:1.7;font-size:15px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid rgba(200,146,42,0.2);text-align:center;font-size:12px;color:#8a7060;">
      LinkClaw · AI 活动智能匹配平台
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,${GUILD_COLORS.gold},#a07020);color:${GUILD_COLORS.mahogany};text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
      ${text}
    </a>
  </div>`;
}

// ── Template: Application Accepted ──────────────────────────

export function applicationAcceptedEmail(params: {
  locale: string;
  hunterName: string;
  questTitle: string;
  questUrl: string;
}): { subject: string; html: string; text: string } {
  const isZh = params.locale === 'zh';

  const subject = isZh
    ? `✅ 你的接单申请已通过 — ${params.questTitle}`
    : `✅ Your claim has been approved — ${params.questTitle}`;

  const html = baseLayout(`
    <p style="font-size:17px;font-weight:bold;color:${GUILD_COLORS.mahogany};">
      ${isZh ? `${params.hunterName}，恭喜！` : `Congratulations, ${params.hunterName}!`}
    </p>
    <p>${isZh
      ? `你对悬赏任务「<strong>${params.questTitle}</strong>」的接单申请已被悬赏人通过。`
      : `Your claim for the quest "<strong>${params.questTitle}</strong>" has been approved by the commissioner.`
    }</p>
    ${ctaButton(isZh ? '查看悬赏详情' : 'View Quest Details', params.questUrl)}
    <p style="font-size:13px;color:#8a7060;font-style:italic;">
      ${isZh ? '准备好迎接挑战吧，猎人。' : 'Get ready for the challenge, hunter.'}
    </p>
  `);

  const text = isZh
    ? `${params.hunterName}，你对「${params.questTitle}」的接单申请已通过。查看详情：${params.questUrl}`
    : `${params.hunterName}, your claim for "${params.questTitle}" has been approved. Details: ${params.questUrl}`;

  return { subject, html, text };
}

// ── Template: New Invitation Received ───────────────────────

export function invitationReceivedEmail(params: {
  locale: string;
  hunterName: string;
  questTitle: string;
  commissionerName: string;
  matchReason?: string | null;
  questUrl: string;
}): { subject: string; html: string; text: string } {
  const isZh = params.locale === 'zh';

  const subject = isZh
    ? `📜 你收到了一份指名委托 — ${params.questTitle}`
    : `📜 You received a direct commission — ${params.questTitle}`;

  const reasonBlock = params.matchReason
    ? `<div style="margin:16px 0;padding:12px 16px;background:rgba(200,146,42,0.08);border:1px solid rgba(200,146,42,0.2);border-radius:4px;font-style:italic;font-size:14px;color:#5a3a20;">
        ${isZh ? '委托理由：' : 'Commission reason: '}${params.matchReason}
      </div>`
    : '';

  const html = baseLayout(`
    <p style="font-size:17px;font-weight:bold;color:${GUILD_COLORS.mahogany};">
      ${isZh ? `${params.hunterName}，有人点名找你！` : `${params.hunterName}, someone asked for you by name!`}
    </p>
    <p>${isZh
      ? `悬赏人 <strong>${params.commissionerName}</strong> 向你发出了悬赏任务「<strong>${params.questTitle}</strong>」的指名委托。`
      : `Commissioner <strong>${params.commissionerName}</strong> has sent you a direct commission for the quest "<strong>${params.questTitle}</strong>".`
    }</p>
    ${reasonBlock}
    ${ctaButton(isZh ? '查看并回应' : 'View & Respond', params.questUrl)}
    <p style="font-size:13px;color:#8a7060;font-style:italic;">
      ${isZh ? '指名委托不受段位限制，悬赏人已认可你的实力。' : 'Direct commissions bypass rank requirements — the commissioner trusts your abilities.'}
    </p>
  `);

  const text = isZh
    ? `${params.hunterName}，悬赏人${params.commissionerName}向你发出了「${params.questTitle}」的指名委托。查看详情：${params.questUrl}`
    : `${params.hunterName}, commissioner ${params.commissionerName} sent you a direct commission for "${params.questTitle}". Details: ${params.questUrl}`;

  return { subject, html, text };
}

// ── Template: Event Reminder ────────────────────────────────

export function eventReminderEmail(params: {
  locale: string;
  userName: string;
  questTitle: string;
  eventDate: string;
  location: string;
  questUrl: string;
}): { subject: string; html: string; text: string } {
  const isZh = params.locale === 'zh';

  const subject = isZh
    ? `⏰ 悬赏任务即将开始 — ${params.questTitle}`
    : `⏰ Quest starting soon — ${params.questTitle}`;

  const html = baseLayout(`
    <p style="font-size:17px;font-weight:bold;color:${GUILD_COLORS.mahogany};">
      ${isZh ? `${params.userName}，任务即将开始！` : `${params.userName}, your quest is about to begin!`}
    </p>
    <p>${isZh
      ? `你参与的悬赏任务「<strong>${params.questTitle}</strong>」即将开始。`
      : `The quest "<strong>${params.questTitle}</strong>" you're participating in is starting soon.`
    }</p>
    <div style="margin:16px 0;padding:12px 16px;background:rgba(200,146,42,0.06);border:1px solid rgba(200,146,42,0.15);border-radius:4px;">
      <div style="font-size:13px;color:#8a7060;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
        ${isZh ? '时间' : 'Time'}
      </div>
      <div style="font-weight:bold;color:${GUILD_COLORS.mahogany};">${params.eventDate}</div>
      <div style="font-size:13px;color:#8a7060;text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:4px;">
        ${isZh ? '地点' : 'Location'}
      </div>
      <div style="font-weight:bold;color:${GUILD_COLORS.mahogany};">${params.location}</div>
    </div>
    ${ctaButton(isZh ? '查看悬赏详情' : 'View Quest Details', params.questUrl)}
  `);

  const text = isZh
    ? `${params.userName}，你参与的「${params.questTitle}」即将开始。时间：${params.eventDate}，地点：${params.location}。详情：${params.questUrl}`
    : `${params.userName}, "${params.questTitle}" is starting soon. Time: ${params.eventDate}, Location: ${params.location}. Details: ${params.questUrl}`;

  return { subject, html, text };
}
