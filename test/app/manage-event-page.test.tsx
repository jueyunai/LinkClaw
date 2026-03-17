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

import { ManageEventContent } from '@/app/[locale]/events/[id]/manage/page';

describe('ManageEventContent', () => {
  it('草稿活动显示编辑表单与发布按钮', () => {
    render(
      <ManageEventContent
        event={{
          id: 'event-1',
          organizer_id: 'user-1',
          title: '测试活动',
          description: '活动描述',
          target_audience: 'AI 创业者',
          event_date: '2026-03-11T15:04:00.000Z',
          location: '深圳',
          max_guests: 20,
          status: 'draft',
        }}
        recommendedGuests={[]}
        invitedGuests={[]}
      />,
    );

    expect(screen.getByDisplayValue('测试活动')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'saveChanges' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'unpublish' })).not.toBeInTheDocument();
  });
});
