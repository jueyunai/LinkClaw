import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const getLocaleMock = vi.fn(async () => 'zh');
const signUpMock = vi.fn();
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

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next-intl/server', () => ({
  getLocale: getLocaleMock,
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/auth', () => ({
  getAuthProvider: vi.fn(() => null),
}));

vi.mock('@/lib/auth/guancha', () => ({
  generateCodeVerifier: vi.fn(),
  generateCodeChallenge: vi.fn(),
  generateState: vi.fn(),
  buildAuthorizeUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: signUpMock,
      getUser: authGetUserMock,
    },
    from: fromMock,
  })),
}));

describe('auth actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    profileSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    profileInsertMock.mockResolvedValue({
      error: null,
    });

    authGetUserMock.mockResolvedValue({
      data: {
        user: null,
      },
    });
  });

  it('注册成功且拿到 user id 时补建 profile', async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {
            role: 'guest',
            display_name: '测试用户',
          },
        },
      },
      error: null,
    });

    const { register } = await import('@/app/[locale]/auth/actions');
    const formData = new FormData();
    formData.set('email', 'guest@example.com');
    formData.set('password', 'password123');
    formData.set('role', 'guest');
    formData.set('displayName', '测试用户');

    await expect(register(formData)).rejects.toThrow(
      'REDIRECT:/zh/auth/verify-email?email=guest%40example.com',
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
  });

  it('注册成功但暂时拿不到 user id 时仍允许进入后续验证链路', async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    const { register } = await import('@/app/[locale]/auth/actions');
    const formData = new FormData();
    formData.set('email', 'guest@example.com');
    formData.set('password', 'password123');
    formData.set('role', 'guest');
    formData.set('displayName', '测试用户');

    await expect(register(formData)).rejects.toThrow(
      'REDIRECT:/zh/auth/verify-email?email=guest%40example.com',
    );

    expect(profileInsertMock).not.toHaveBeenCalled();
  });
});
