import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Database, UserRole } from '@/types/database';

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        try {
          await ensureProfileExists(
            user.id,
            typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : undefined,
            typeof user.user_metadata?.display_name === 'string'
              ? user.user_metadata.display_name
              : undefined,
          );
        } catch {
          return buildLoginRedirect(origin, locale, 'auth_failed', redirect);
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return buildLoginRedirect(origin, locale, 'auth_failed', redirect);
}
