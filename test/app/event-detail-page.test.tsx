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

import { EventDetailContent } from '@/app/[locale]/events/[id]/page';

describe('EventDetailContent', () => {
  const baseProps = {
    event: {
      id: 'event-1',
      organizer_id: 'organizer-1',
      title: '测试活动',
      description: '活动描述',
      target_audience: 'AI 创业者',
      event_date: '2026-03-11T15:04:00.000Z',
      location: '深圳',
      max_guests: 20,
      bounty_rank: 3,
      status: 'published' as const,
    },
    organizer: null,
    currentUserId: 'guest-1',
    currentUserRole: 'guest' as const,
  };

  it.each([
    { type: 'applied' as const, status: 'pending' as const, label: 'applicationPending' },
    { type: 'applied' as const, status: 'accepted' as const, label: 'applicationAccepted' },
    { type: 'applied' as const, status: 'rejected' as const, label: 'applicationRejected' },
    { type: 'invited' as const, status: 'pending' as const, label: 'invitationPending' },
    { type: 'invited' as const, status: 'accepted' as const, label: 'invitationAccepted' },
    { type: 'invited' as const, status: 'rejected' as const, label: 'invitationRejected' },
  ])('当报名类型为 $type 且状态为 $status 时显示 $label 并禁用按钮', ({ type, status, label }) => {
    render(
      <EventDetailContent
        {...baseProps}
        hunterLevel={3}
        registration={{
          type,
          status,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: label })).toBeDisabled();
  });

  it('段位不足时显示评估气泡并禁用接单按钮', () => {
    render(
      <EventDetailContent
        {...baseProps}
        hunterLevel={1}
        registration={null}
      />,
    );

    expect(screen.getByText('eval_locked')).toBeInTheDocument();
    expect(screen.getByText('rank_required_detail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'claim' })).toBeDisabled();
  });

  it('段位足够时允许接单并展示段位徽章', () => {
    render(
      <EventDetailContent
        {...baseProps}
        hunterLevel={3}
        registration={null}
      />,
    );

    expect(screen.getAllByText('level_gold').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'claim' })).toBeEnabled();
  });
});
