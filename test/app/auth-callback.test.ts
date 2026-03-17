import { describe, expect, it, vi, beforeEach } from 'vitest';

const getAuthProviderMock = vi.fn((id: string) => {
  if (id === 'guancha') {
    return {
      id: 'guancha',
      enabled: false,
    };
  }

  return null;
});

const exchangeCodeForSessionMock = vi.fn();
const authGetUserMock = vi.fn();
const profileSingleMock = vi.fn();
const profileInsertMock = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === 'profiles') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: profileSingleMock,
          single: profileSingleMock,
        })),
      })),
      insert: profileInsertMock,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('@/lib/auth', () => ({
  getAuthProvider: getAuthProviderMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getUser: authGetUserMock,
    },
    from: fromMock,
  })),
}));

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    profileSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });
    profileInsertMock.mockResolvedValue({
      error: null,
    });
  });

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

  it('危险的协议相对 redirect 会回退为根路径', async () => {
    const { GET } = await import('@/app/[locale]/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:3000/zh/auth/callback?error=access_denied&redirect=%2F%2Fevil.com'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/zh/auth/login?error=access_denied&redirect=%2F',
    );
  });

  it('code 兑换成功后会为首次登录用户补建 profile', async () => {
    authGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {
            role: 'guest',
            display_name: '测试用户',
          },
        },
      },
    });

    const { GET } = await import('@/app/[locale]/auth/callback/route');
    const response = await GET(
      new Request('http://localhost:3000/zh/auth/callback?code=valid-code&redirect=%2Fzh%2Fprofile'),
    );

    expect(profileInsertMock).toHaveBeenCalledWith({
      id: 'user-1',
      role: 'guest',
      display_name: '测试用户',
      bio: null,
      industry: null,
      city: null,
      avatar_url: null,
    });
    expect(response.headers.get('location')).toBe('http://localhost:3000/zh/profile');
  });
});
