'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type ProfileFrom = 'home' | 'center';

function normalizeFrom(value: string | null): ProfileFrom {
  if (value === 'home') return 'home';
  return 'center';
}

function getSuccessRedirect(locale: string, from: ProfileFrom): string {
  if (from === 'home') {
    return `/${locale}?profileUpdated=true`;
  }
  return `/${locale}/my-events?profileUpdated=true`;
}

function getErrorRedirect(locale: string, from: ProfileFrom, error: string): string {
  const params = new URLSearchParams({ from, error });
  return `/${locale}/profile?${params.toString()}`;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();
  const from = normalizeFrom(formData.get('from') as string | null);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
    display_name: formData.get('displayName') as string,
    bio: (formData.get('bio') as string) || null,
    industry: (formData.get('industry') as string) || null,
    city: (formData.get('city') as string) || null,
  };

  const { error } = await supabase
    .from('profiles')
    .update(profileUpdate as never)
    .eq('id', user.id);

  if (error) {
    redirect(getErrorRedirect(locale, from, error.message));
  }

  redirect(getSuccessRedirect(locale, from));
}
