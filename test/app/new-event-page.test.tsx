import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NewEventPage from '@/app/[locale]/events/new/page';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: { id: 'user-1' },
        },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { role: 'organizer' },
          })),
        })),
      })),
    })),
  })),
}));

describe('NewEventPage', () => {
  it('渲染保存草稿与直接发布按钮且不显示状态下拉', async () => {
    const page = await NewEventPage({
      params: Promise.resolve({ locale: 'zh' }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByRole('button', { name: 'saveDraft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'publishNow' })).toBeInTheDocument();
    expect(screen.queryByLabelText('status')).not.toBeInTheDocument();
  });
});
