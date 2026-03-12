export type AuthProviderId = 'email' | 'guancha';
export type AuthProviderKind = 'email' | 'oauth';

export interface AuthProviderConfig {
  id: AuthProviderId;
  kind: AuthProviderKind;
  enabled: boolean;
  comingSoon: boolean;
  nameKey: string;
  actionKey: string;
  unavailableMessageKey?: string;
}

const authProviders: Record<AuthProviderId, AuthProviderConfig> = {
  email: {
    id: 'email',
    kind: 'email',
    enabled: true,
    comingSoon: false,
    nameKey: 'providers.email.name',
    actionKey: 'providers.email.action',
  },
  guancha: {
    id: 'guancha',
    kind: 'oauth',
    enabled: false,
    comingSoon: true,
    nameKey: 'providers.guancha.name',
    actionKey: 'providers.guancha.action',
    unavailableMessageKey: 'providers.guancha.unavailable',
  },
};

export function getAuthProvider(id: string) {
  return authProviders[id as AuthProviderId] ?? null;
}

export function getAuthProviders() {
  return Object.values(authProviders);
}

export function getVisibleAuthProviders() {
  return getAuthProviders().filter((provider) => provider.kind !== 'email');
}
