'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getAuthProvider, type AuthProviderId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

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

export async function startAuth(providerId: AuthProviderId, redirectTo?: string) {
  const locale = await getLocale();
  const provider = getAuthProvider(providerId);

  if (!provider) {
    redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.unsupportedProvider', redirectTo));
  }

  if (!provider.enabled) {
    redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.providerUnavailable', redirectTo));
  }

  redirect(buildAuthErrorRedirectPath(locale, 'auth.errors.providerNotReady', redirectTo));
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
