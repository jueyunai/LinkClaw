import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ensureProfileExists } from '@/lib/auth/profile';
import {
  exchangeCodeForTokens,
  getUserInfo,
  getSyntheticEmail,
  getDeterministicPassword,
} from '@/lib/auth/guancha';

const OAUTH_COOKIES = [
  'guancha_oauth_state',
  'guancha_code_verifier',
  'guancha_oauth_locale',
  'guancha_oauth_redirect',
] as const;

async function ensureGuanchaIdentity(params: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  guanchaUserId: number;
}) {
  const identityInsert: Database['public']['Tables']['user_auth_identities']['Insert'] = {
    user_id: params.userId,
    provider: 'guancha',
    provider_subject: String(params.guanchaUserId),
    provider_email: null,
  };
  const providerSubject = identityInsert.provider_subject;
  const { data: existing, error: existingError } = await params.admin
    .from('user_auth_identities')
    .select('id')
    .eq('provider', 'guancha')
    .eq('provider_subject', providerSubject)
    .maybeSingle();

  if (existingError) {
    console.error('查询观猹身份关联失败:', existingError);
    return;
  }

  if (existing) {
    return;
  }

  const { error: insertError } = await params.admin.from('user_auth_identities').insert(identityInsert as never);

  if (insertError) {
    console.error('写入观猹身份关联失败:', insertError);
  }
}

function buildLoginRedirect(origin: string, locale: string, error: string, redirectTo?: string) {
  const loginUrl = new URL(`/${locale}/auth/login`, origin);
  loginUrl.searchParams.set('error', error);

  if (redirectTo && redirectTo !== '/') {
    loginUrl.searchParams.set('redirect', redirectTo);
  }

  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  // 读取并清理 OAuth cookie
  const cookieStore = await cookies();
  const savedState = cookieStore.get('guancha_oauth_state')?.value;
  const codeVerifier = cookieStore.get('guancha_code_verifier')?.value;
  const locale = cookieStore.get('guancha_oauth_locale')?.value || 'zh';
  const redirectTo = cookieStore.get('guancha_oauth_redirect')?.value || '/';

  for (const name of OAUTH_COOKIES) {
    cookieStore.delete(name);
  }

  const redirectWithError = (errorKey: string) =>
    buildLoginRedirect(origin, locale, errorKey, redirectTo);

  // 观猹返回了错误（用户主动取消授权等）
  if (oauthError) {
    return redirectWithError('auth.errors.authCancelled');
  }

  // 缺少必要参数或 state 不匹配
  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    return redirectWithError('auth.errors.providerNotReady');
  }

  try {
    const callbackUrl = `${origin}/api/auth/guancha/callback`;

    // 1. 用授权码换 token
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    // 2. 获取观猹用户信息
    const userInfo = await getUserInfo(tokens.access_token);

    // 3. 映射到 Supabase 用户
    const syntheticEmail = getSyntheticEmail(userInfo.user_id);
    const password = getDeterministicPassword(userInfo.user_id);

    const supabase = await createClient();

    // 先尝试登录（用户已存在的情况）
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (signInData?.user) {
      // 登录成功，后台更新用户元数据（昵称、头像等）
      const admin = createAdminClient();
      admin.auth.admin
        .updateUserById(signInData.user.id, {
          user_metadata: {
            display_name: userInfo.nickname,
            avatar_url: userInfo.avatar_url,
            guancha_user_id: userInfo.user_id,
            auth_provider: 'guancha',
          },
        })
        .catch((err) => console.error('更新观猹用户元数据失败:', err));

      await ensureGuanchaIdentity({
        admin,
        userId: signInData.user.id,
        guanchaUserId: userInfo.user_id,
      });

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    // 登录失败 → 用户不存在，创建新用户
    if (signInError) {
      const admin = createAdminClient();

      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: userInfo.nickname,
          avatar_url: userInfo.avatar_url,
          role: 'guest',
          guancha_user_id: userInfo.user_id,
          auth_provider: 'guancha',
        },
      });

      if (createError || !createData?.user) {
        console.error('创建观猹用户失败:', createError);
        return redirectWithError('auth.errors.providerNotReady');
      }

      await ensureGuanchaIdentity({
        admin,
        userId: createData.user.id,
        guanchaUserId: userInfo.user_id,
      });

      // 为新用户创建 profile（修复：OAuth 新用户缺少 profile 导致全站异常）
      await ensureProfileExists(admin, createData.user.id, 'guest', userInfo.nickname);

      // 创建成功后登录
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

      if (retryError) {
        console.error('观猹用户创建后登录失败:', retryError);
        return redirectWithError('auth.errors.providerNotReady');
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    return redirectWithError('auth.errors.providerNotReady');
  } catch (err) {
    console.error('观猹 OAuth 回调处理失败:', err);
    return redirectWithError('auth.errors.providerNotReady');
  }
}
