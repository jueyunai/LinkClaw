import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect || !redirect.startsWith('/')) {
    return '/';
  }

  return redirect;
}

function buildLoginRedirect(origin: string, locale: string, error: string, redirect?: string) {
  const loginUrl = new URL(`/${locale}/auth/login`, origin);
  loginUrl.searchParams.set('error', error);

  if (redirect) {
    loginUrl.searchParams.set('redirect', redirect);
  }

  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code = searchParams.get('code');
  const providerId = searchParams.get('provider');
  const authError = searchParams.get('error');
  const redirect = getSafeRedirectPath(searchParams.get('redirect'));
  const locale = pathname.startsWith('/en') ? 'en' : 'zh';

  if (authError) {
    return buildLoginRedirect(origin, locale, authError, redirect);
  }

  if (providerId) {
    const provider = getAuthProvider(providerId);

    if (!provider) {
      return buildLoginRedirect(
        origin,
        locale,
        'auth.errors.unsupportedProvider',
        redirect,
      );
    }

    if (!provider.enabled) {
      return buildLoginRedirect(
        origin,
        locale,
        'auth.errors.providerUnavailable',
        redirect,
      );
    }

    return buildLoginRedirect(
      origin,
      locale,
      'auth.errors.providerNotReady',
      redirect,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return buildLoginRedirect(origin, locale, 'auth_failed', redirect);
}
