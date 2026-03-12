import { createHmac, randomBytes, createHash } from 'crypto';

// ---------- 配置 ----------

function getGuanchaConfig() {
  const clientId = process.env.GUANCHA_CLIENT_ID;
  const clientSecret = process.env.GUANCHA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('缺少观猹 OAuth 环境变量配置（GUANCHA_CLIENT_ID / GUANCHA_CLIENT_SECRET）');
  }

  return { clientId, clientSecret };
}

// ---------- PKCE ----------

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(): string {
  return randomBytes(16).toString('hex');
}

// ---------- 授权 URL ----------

export function buildAuthorizeUrl(params: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
}): string {
  const { clientId } = getGuanchaConfig();

  const url = new URL('https://watcha.cn/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', 'read');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return url.toString();
}

// ---------- Token 交换 ----------

export interface GuanchaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GuanchaTokenResponse> {
  const { clientId, clientSecret } = getGuanchaConfig();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch('https://watcha.cn/oauth/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || '观猹 token 交换失败');
  }

  return response.json();
}

// ---------- 用户信息 ----------

export interface GuanchaUserInfo {
  user_id: number;
  nickname: string;
  avatar_url?: string;
}

export async function getUserInfo(accessToken: string): Promise<GuanchaUserInfo> {
  const response = await fetch(
    `https://watcha.cn/oauth/api/userinfo?access_token=${encodeURIComponent(accessToken)}`,
  );

  const result = await response.json();

  if (result.statusCode !== 200 || !result.data) {
    throw new Error(result.message || '获取观猹用户信息失败');
  }

  return result.data;
}

// ---------- Supabase 用户映射 ----------

/** 为观猹用户生成合成邮箱，作为 Supabase 用户标识 */
export function getSyntheticEmail(guanchaUserId: number): string {
  return `guancha_${guanchaUserId}@oauth.linkclaw.app`;
}

/** 基于 client_secret + user_id 派生确定性密码 */
export function getDeterministicPassword(guanchaUserId: number): string {
  const { clientSecret } = getGuanchaConfig();
  return createHmac('sha256', clientSecret)
    .update(`guancha_user:${guanchaUserId}`)
    .digest('hex');
}
