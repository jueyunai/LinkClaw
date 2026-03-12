import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getAuthProvider: (id: string) => {
    if (id === 'guancha') {
      return {
        id: 'guancha',
        enabled: false,
      };
    }

    return null;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    },
  })),
}));

describe('auth callback route', () => {
  it('未知 provider 时回登录页并保留 redirect', async () => {
    const { GET } = await import('@/app/[locale]/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:3000/zh/auth/callback?provider=unknown&redirect=%2Fzh%2Fprofile'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/zh/auth/login?error=auth.errors.unsupportedProvider&redirect=%2Fzh%2Fprofile',
    );
  });

  it('未启用 provider 时回登录页', async () => {
    const { GET } = await import('@/app/[locale]/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:3000/en/auth/callback?provider=guancha'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en/auth/login?error=auth.errors.providerUnavailable&redirect=%2F',
    );
  });

  it('显式 error 参数时优先回登录页', async () => {
    const { GET } = await import('@/app/[locale]/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:3000/zh/auth/callback?error=access_denied'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/zh/auth/login?error=access_denied&redirect=%2F',
    );
  });
});
