import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PendingSubmitButton } from '@/components/ui/pending-submit-button';

const useFormStatusMock = vi.fn(() => ({ pending: false, data: null, method: null, action: null }));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');

  return {
    ...actual,
    useFormStatus: () => useFormStatusMock(),
  };
});

describe('PendingSubmitButton', () => {
  beforeEach(() => {
    useFormStatusMock.mockReset();
    useFormStatusMock.mockReturnValue({ pending: false, data: null, method: null, action: null });
  });

  it('空闲态显示 idle 文案，并透传按钮属性', () => {
    useFormStatusMock.mockReturnValue({ pending: false, data: null, method: null, action: null });

    render(
      <PendingSubmitButton idleText="保存" pendingText="保存中..." variant="outline" size="sm" className="extra-class">
        额外子内容
      </PendingSubmitButton>,
    );

    const button = screen.getByRole('button', { name: /保存/ });

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('保存');
    expect(button).not.toBeDisabled();
    expect(button.className).toContain('extra-class');
  });

  it('提交态显示 pending 文案并自动禁用', () => {
    useFormStatusMock.mockReturnValue({ pending: true, data: null, method: null, action: null });

    render(<PendingSubmitButton idleText="发布" pendingText="发布中..." />);

    const button = screen.getByRole('button', { name: '发布中...' });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('发布中...');
  });

  it('同一表单提交时仅当前 submitter 显示 pending 文案', () => {
    const formData = new FormData();
    formData.set('intent', 'draft');
    useFormStatusMock
      .mockReturnValueOnce({ pending: true, data: formData, method: 'post', action: null })
      .mockReturnValueOnce({ pending: true, data: formData, method: 'post', action: null });

    render(
      <>
        <PendingSubmitButton name="intent" value="draft" idleText="保存草稿" pendingText="保存中..." />
        <PendingSubmitButton name="intent" value="publish" idleText="直接发布" pendingText="发布中..." />
      </>,
    );

    expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '直接发布' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '发布中...' })).not.toBeInTheDocument();
  });
});
