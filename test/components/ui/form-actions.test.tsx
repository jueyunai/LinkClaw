import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormActions } from '@/components/ui/form-actions';

describe('FormActions', () => {
  it('默认提供右对齐与换行布局 class', () => {
    render(
      <FormActions data-testid="actions">
        <button type="button">取消</button>
        <button type="submit">保存</button>
      </FormActions>,
    );

    const actions = screen.getByTestId('actions');

    expect(actions.className).toContain('flex');
    expect(actions.className).toContain('flex-wrap');
    expect(actions.className).toContain('justify-end');
    expect(actions.className).toContain('gap-2');
  });
});
