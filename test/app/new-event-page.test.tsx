import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const useFormStatusMock = vi.fn(() => ({ pending: false, data: null, method: 'post', action: null }));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');

  return {
    ...actual,
    useFormStatus: () => useFormStatusMock(),
  };
});

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
  beforeEach(() => {
    useFormStatusMock.mockReset();
    useFormStatusMock.mockReturnValue({ pending: false, data: null, method: 'post', action: null });
  });

  it('渲染保存草稿与直接发布按钮且不显示状态下拉，并使用统一右对齐操作区', async () => {
    const page = await NewEventPage({
      params: Promise.resolve({ locale: 'zh' }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByRole('button', { name: 'saveDraft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'publishNow' })).toBeInTheDocument();
    expect(screen.queryByLabelText('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('new-event-form-actions')).toBeInTheDocument();
  });

  it('同一表单提交时仅当前按钮显示对应 pending 文案', async () => {
    const formData = new FormData();
    formData.set('intent', 'draft');
    useFormStatusMock
      .mockReturnValueOnce({ pending: true, data: formData, method: 'post', action: null })
      .mockReturnValueOnce({ pending: true, data: formData, method: 'post', action: null });

    const page = await NewEventPage({
      params: Promise.resolve({ locale: 'zh' }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByRole('button', { name: 'pending.saving' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'publishNow' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'pending.publishing' })).not.toBeInTheDocument();
  });
});
