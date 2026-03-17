'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { getAuthProvider, type AuthProviderId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Database, UserRole } from '@/types/database';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizeUrl,
} from '@/lib/auth/guancha';

async function getLoginErrorMessage(message: string) {
  const t = await getTranslations('auth.errors');

  if (message === 'Email not confirmed') {
    return t('emailNotConfirmed');
  }

  if (message === 'Invalid login credentials') {
    return t('invalidCredentials');
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

function getProfileRole(role: string | undefined): UserRole {
  return role === 'organizer' ? 'organizer' : 'guest';
}

async function ensureProfileExists(
  userId: string,
  role: string | undefined,
  displayName: string | undefined,
) {
  const supabase = await createClient();
  const normalizedRole = getProfileRole(role);
  const normalizedDisplayName = displayName?.trim() || 'LinkClaw User';

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfileError && !existingProfileError.message.toLowerCase().includes('no rows')) {
    throw existingProfileError;
  }

  if (existingProfile) {
    return;
  }

  const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
    id: userId,
    role: normalizedRole,
    display_name: normalizedDisplayName,
    bio: null,
    industry: null,
    city: null,
    avatar_url: null,
  };

  const { error: insertError } = await supabase.from('profiles').insert(profileInsert as never);

  if (
    insertError &&
    !insertError.message.toLowerCase().includes('duplicate') &&
    !insertError.message.toLowerCase().includes('unique')
  ) {
    throw insertError;
  }
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
    const errorMessage = await getLoginErrorMessage(error.message);
    redirect(`/${locale}/auth/login?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(`/${locale}`);
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const displayName = formData.get('displayName') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: formData.get('password') as string,
    options: {
      data: {
        role,
        display_name: displayName,
      },
    },
  });

  if (error) {
    redirect(`/${locale}/auth/register?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user?.id) {
    try {
      await ensureProfileExists(data.user.id, role, displayName);
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : 'Profile setup failed';
      redirect(`/${locale}/auth/register?error=${encodeURIComponent(message)}`);
    }
  }

  redirect(`/${locale}/auth/verify-email?email=${encodeURIComponent(email)}`);
}

export async function logout() {
  const supabase = await createClient();
  const locale = await getLocale();

  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
