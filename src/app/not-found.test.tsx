import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlobalNotFound from '@/app/not-found';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('global not found page', () => {
  it('renders custom 404 content', () => {
    render(<GlobalNotFound />);

    expect(screen.getByText('404 · LinkClaw')).toBeInTheDocument();
    expect(screen.getByText(/页面不存在/)).toBeInTheDocument();
    expect(screen.getByText(/Page not found/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });
});
