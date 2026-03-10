import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from '@/app/[locale]/profile/page';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ProfileForm', () => {
  it('渲染画像表单字段与状态提示', () => {
    render(
      <ProfileForm
        profile={{
          display_name: 'Alice',
          bio: 'Tech founder',
          industry: 'AI',
          city: 'Shanghai',
        }}
        error="保存失败"
        success
      />,
    );

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tech founder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Shanghai')).toBeInTheDocument();
    expect(screen.getByText('保存失败')).toBeInTheDocument();
    expect(screen.getByText('saveSuccess')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'save' })).toBeInTheDocument();
  });
});
