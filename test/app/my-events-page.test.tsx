import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
  useTranslations: () => (key: string) => key,
}));

import { GuestInvitationCard } from '@/app/[locale]/my-events/page';

describe('GuestInvitationCard', () => {
  it('邀请存在 ai_match_reason 时展示推荐理由区块', () => {
    render(
      <GuestInvitationCard
        item={{
          id: 'registration-1',
          status: 'pending',
          ai_match_reason: '你与本场活动的目标人群高度匹配',
          event: {
            id: 'event-1',
            title: '测试活动',
            location: '深圳',
            event_date: '2026-03-11T15:04:00.000Z',
            status: 'published',
          },
        }}
      />,
    );

    expect(screen.getByText('invitationReason')).toBeInTheDocument();
    expect(screen.getByText('你与本场活动的目标人群高度匹配')).toBeInTheDocument();
  });

  it('邀请没有 ai_match_reason 时不展示推荐理由区块', () => {
    render(
      <GuestInvitationCard
        item={{
          id: 'registration-2',
          status: 'pending',
          ai_match_reason: null,
          event: {
            id: 'event-1',
            title: '测试活动',
            location: '深圳',
            event_date: '2026-03-11T15:04:00.000Z',
            status: 'published',
          },
        }}
      />,
    );

    expect(screen.queryByText('invitationReason')).not.toBeInTheDocument();
  });
});
