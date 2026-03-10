'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    redirect(`/${locale}/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}`);
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
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

  redirect(`/${locale}/profile`);
}

export async function logout() {
  const supabase = await createClient();
  const locale = await getLocale();

  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
