import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRole } from '@/types/database';

function getProfileRole(role: string | undefined): UserRole {
  return role === 'organizer' ? 'organizer' : 'guest';
}

/**
 * 确保用户在 profiles 表中有记录。
 * 调用方需传入一个有写权限的 Supabase client（普通 client 或 admin client 均可）。
 * 如果 profile 已存在则跳过；如果遇到 unique 冲突也静默处理（并发安全）。
 */
export async function ensureProfileExists(
  client: SupabaseClient<Database>,
  userId: string,
  role: string | undefined,
  displayName: string | undefined,
) {
  const normalizedRole = getProfileRole(role);
  const normalizedDisplayName = displayName?.trim() || 'LinkClaw User';

  const { data: existingProfile, error: existingProfileError } = await client
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

  const { error: insertError } = await client.from('profiles').insert(profileInsert as never);

  if (
    insertError &&
    !insertError.message.toLowerCase().includes('duplicate') &&
    !insertError.message.toLowerCase().includes('unique')
  ) {
    throw insertError;
  }
}
