import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LocaleNotFound from '@/app/[locale]/not-found';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('locale not found page', () => {
  it('renders without params', async () => {
    const Page = await LocaleNotFound({} as never);
    render(Page);

    expect(screen.getByText('404 · LinkClaw')).toBeInTheDocument();
    expect(screen.getByText(/页面不存在/)).toBeInTheDocument();
    expect(screen.getByText(/Page not found/)).toBeInTheDocument();
  });
});
