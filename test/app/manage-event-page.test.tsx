import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
  useTranslations: () => (key: string) => key,
}));

const useFormStatusMock = vi.fn(() => ({ pending: false, data: null, method: 'post', action: null }));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');

  return {
    ...actual,
    useFormStatus: () => useFormStatusMock(),
  };
});

import { ManageEventContent } from '@/app/[locale]/events/[id]/manage/page';

const baseEvent = {
  id: 'event-1',
  organizer_id: 'user-1',
  title: '测试活动',
  description: '活动描述',
  target_audience: 'AI 创业者',
  event_date: '2026-03-11T15:04:00.000Z',
  location: '深圳',
  max_guests: 20,
} as const;

describe('ManageEventContent', () => {
  beforeEach(() => {
    useFormStatusMock.mockReset();
    useFormStatusMock.mockReturnValue({ pending: false, data: null, method: 'post', action: null });
  });

  it('草稿活动显示编辑表单、发布按钮和保存按钮，不显示下架按钮', () => {
    render(
      <ManageEventContent
        event={{
          ...baseEvent,
          status: 'draft',
        }}
        recommendedGuests={[]}
        appliedGuests={[]}
        invitedGuests={[]}
      />,
    );

    expect(screen.getByDisplayValue('测试活动')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'saveChanges' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'unpublish' })).not.toBeInTheDocument();
  });

  it('页面使用稳定的统一操作区标识', () => {
    render(
      <ManageEventContent
        event={{
          ...baseEvent,
          status: 'draft',
        }}
        recommendedGuests={[]}
        appliedGuests={[]}
        invitedGuests={[]}
      />,
    );

    const headerActions = screen.getByTestId('manage-event-header-actions');
    const statusActions = screen.getByTestId('manage-event-status-actions');
    const formActions = screen.getByTestId('manage-event-form-actions');

    expect(within(headerActions).getByRole('link', { name: 'viewEvent' })).toBeInTheDocument();
    expect(within(statusActions).getByRole('button', { name: 'publish' })).toBeInTheDocument();
    expect(within(formActions).getByRole('button', { name: 'saveChanges' })).toBeInTheDocument();
  });

  it('提交按钮在 pending 时显示进行中文案并禁用', () => {
    useFormStatusMock.mockReturnValue({ pending: true, data: null, method: 'post', action: null });

    render(
      <ManageEventContent
        event={{
          ...baseEvent,
          status: 'draft',
        }}
        recommendedGuests={[]}
        appliedGuests={[]}
        invitedGuests={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'pending.publishing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'pending.saving' })).toBeDisabled();
  });

  it('推荐嘉宾存在时显示邀请按钮', () => {
    render(
      <ManageEventContent
        event={{
          ...baseEvent,
          status: 'published',
        }}
        recommendedGuests={[
          {
            recommendation: {
              guestId: 'guest-1',
              matchScore: 92,
              matchReasonKey: 'industryOverlap',
              matchReasonParams: { value: 'AI' },
            },
            guest: {
              id: 'guest-1',
              display_name: '嘉宾甲',
              bio: '专注 AI 产品',
              industry: 'AI',
              city: '上海',
              role: 'guest',
            },
          },
        ]}
        appliedGuests={[]}
        invitedGuests={[]}
      />,
    );

    const actions = screen.getByTestId('recommended-guest-actions-guest-1');
    expect(within(actions).getByRole('button', { name: 'inviteGuest' })).toBeInTheDocument();
  });

  it('切换到报名流程标签后显示对应操作区', () => {
    render(
      <ManageEventContent
        event={{
          ...baseEvent,
          status: 'published',
        }}
        recommendedGuests={[]}
        appliedGuests={[
          {
            id: 'registration-1',
            guest_id: 'guest-2',
            type: 'applied',
            status: 'pending',
            ai_match_reason: null,
            created_at: '2026-03-10T10:00:00.000Z',
            guest: {
              id: 'guest-2',
              display_name: '报名者乙',
              bio: '想参与活动',
              industry: '机器人',
              city: '北京',
              role: 'guest',
            },
          },
        ]}
        invitedGuests={[]}
      />,
    );

    expect(screen.queryByTestId('application-actions-registration-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /applicationPipeline/ }));

    const actions = screen.getByTestId('application-actions-registration-1');
    expect(within(actions).getByRole('button', { name: 'rejectApplication' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'acceptApplication' })).toBeInTheDocument();
  });
});
