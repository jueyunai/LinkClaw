import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/app/[locale]/auth/login/page';
import { RegisterForm } from '@/app/[locale]/auth/register/page';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/auth', () => ({
  getVisibleAuthProviders: () => [
    {
      id: 'guancha',
      enabled: false,
      comingSoon: true,
      actionKey: 'providers.guancha.action',
    },
  ],
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Auth forms', () => {
  it('渲染登录表单与观猹占位入口', () => {
    const html = renderToStaticMarkup(
      <LoginForm error="auth.errors.providerUnavailable" />,
    );

    expect(html).toContain('auth.errors.providerUnavailable');
    expect(html).toContain('loginAction');
    expect(html).toContain('otherLoginOptions');
    expect(html).toContain('providers.guancha.action');
    expect(html).toContain('comingSoon');
    expect(html).toContain('disabled');
  });

  it('渲染注册表单与观猹占位入口', () => {
    const html = renderToStaticMarkup(<RegisterForm />);

    expect(html).toContain('registerAction');
    expect(html).toContain('otherRegisterOptions');
    expect(html).toContain('providers.guancha.action');
    expect(html).toContain('comingSoon');
    expect(html).toContain('disabled');
  });
});
