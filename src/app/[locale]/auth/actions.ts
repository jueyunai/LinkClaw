'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { getAuthProvider, type AuthProviderId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizeUrl,
} from '@/lib/auth/guancha';

function getLoginErrorMessage(message: string, locale: string) {
  if (message === 'Email not confirmed') {
    return locale === 'en'
      ? 'Your email is not verified yet. Please check your inbox and click the verification link before logging in.'
      : '邮箱尚未验证，请先检查收件箱并点击验证邮件中的链接后再登录。';
  }

  return message;
}

function buildAuthErrorRedirectPath(locale: string, error: string, redirectTo?: string) {
  const params = new URLSearchParams({
    error,
  });

  if (redirectTo) {
    params.set('redirect', redirectTo);
  }

  return `/${locale}/auth/login?${params.toString()}`;
}

export async function startAuth(providerId: AuthProviderId) {
  const locale = await getLocale();
  const provider = getAuthProvider(providerId);

  if (!provider) {
    redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.unsupportedProvider'));
  }

  if (!provider.enabled) {
    redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.providerUnavailable'));
  }

  if (provider.id === 'guancha') {
    let codeVerifier: string;
    let codeChallenge: string;
    let state: string;
    let authorizeUrl: string;

    try {
      codeVerifier = generateCodeVerifier();
      codeChallenge = generateCodeChallenge(codeVerifier);
      state = generateState();

      // 从请求头推断 origin，用于构建回调 URL
      const headersList = await headers();
      const host = headersList.get('host') || 'localhost:3000';
      const proto = headersList.get('x-forwarded-proto') || 'http';
      const callbackUrl = `${proto}://${host}/api/auth/guancha/callback`;

      authorizeUrl = buildAuthorizeUrl({
        codeChallenge,
        state,
        redirectUri: callbackUrl,
      });
    } catch (err) {
      console.error('观猹 OAuth 初始化失败:', err);
      redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.providerUnavailable'));
    }

    // 将 PKCE 和状态信息存入 cookie，供回调路由验证
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600, // 10 分钟
      path: '/',
    };

    cookieStore.set('guancha_code_verifier', codeVerifier, cookieOptions);
    cookieStore.set('guancha_oauth_state', state, cookieOptions);
    cookieStore.set('guancha_oauth_locale', locale, cookieOptions);

    redirect(authorizeUrl);
  }

  redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.providerNotReady'));
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    const errorMessage = getLoginErrorMessage(error.message, locale);
    redirect(`/${locale}/auth/login?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(`/${locale}`);
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();
  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password: formData.get('password') as string,
    options: {
      data: {
        role: formData.get('role') as string,
        display_name: formData.get('displayName') as string,
      },
    },
  });

  if (error) {
    redirect(`/${locale}/auth/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/auth/verify-email?email=${encodeURIComponent(email)}`);
}

export async function logout() {
  const supabase = await createClient();
  const locale = await getLocale();

  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
