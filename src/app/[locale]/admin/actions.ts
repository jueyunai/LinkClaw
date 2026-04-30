'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { isAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function updateHunterLevel(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/admin/hunters`);
  }

  if (!isAdmin(user.email)) {
    redirect(`/${locale}`);
  }

  const targetUserId = formData.get('targetUserId') as string;
  const newLevel = Number(formData.get('newLevel'));

  if (!targetUserId || !Number.isInteger(newLevel) || newLevel < 1 || newLevel > 6) {
    redirect(`/${locale}/admin/hunters?error=${encodeURIComponent('猎人段位无效')}`);
  }

  const admin = createAdminClient();

  // Check that the target user exists and is a guest before updating
  const { data: targetProfile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .eq('role', 'guest')
    .maybeSingle();

  if (lookupError) {
    redirect(`/${locale}/admin/hunters?error=${encodeURIComponent(lookupError.message)}`);
  }

  if (!targetProfile) {
    redirect(`/${locale}/admin/hunters?error=${encodeURIComponent('目标猎人不存在')}`);
  }

  const { error } = await admin
    .from('profiles')
    .update({ hunter_level: newLevel } as never)
    .eq('id', targetUserId)
    .eq('role', 'guest');

  if (error) {
    redirect(`/${locale}/admin/hunters?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/${locale}/admin/hunters`);
  redirect(`/${locale}/admin/hunters?success=updated`);
}
