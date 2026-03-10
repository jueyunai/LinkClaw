'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

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
    redirect(`/${locale}/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/profile?success=true`);
}
