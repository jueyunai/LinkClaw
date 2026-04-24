import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getVisibleAuthProviders } from '@/lib/auth';
import { Link } from '@/i18n/navigation';
import { login, startAuth } from '../actions';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;

  return <LoginForm error={error} />;
}

export function LoginForm({ error }: { error?: string }) {
  const t = useTranslations('auth');
  const providers = getVisibleAuthProviders();

  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #f5ead6 0%, #f8f2e4 100%)' }}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-20 left-1/4 text-[#c8922a]/5 text-[200px] select-none font-display">✦</div>
        <div className="absolute bottom-20 right-1/4 text-[#c8922a]/5 text-[150px] select-none font-display">◆</div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Top ornament */}
        <div className="flex justify-center mb-6">
          <div
            className="flex size-14 items-center justify-center rounded-full text-lg font-bold"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #c8922a, #8b5e1a)',
              boxShadow: '0 4px 16px rgba(200,146,42,0.4), inset 0 1px 0 rgba(255,220,120,0.3)',
              color: '#2a1206',
              fontFamily: 'var(--font-cinzel)',
            }}
          >
            LC
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #fdf8f0 0%, #f8f0e0 100%)',
            border: '1px solid rgba(180,140,80,0.3)',
            boxShadow: '0 8px 40px rgba(61,31,10,0.12), 0 2px 8px rgba(61,31,10,0.06), inset 0 1px 0 rgba(255,240,180,0.4)',
          }}
        >
          {/* Card header with gold rule */}
          <div
            className="px-8 pt-8 pb-6 text-center"
            style={{ borderBottom: '1px solid rgba(180,140,80,0.2)' }}
          >
            <h1
              className="text-2xl font-bold tracking-wide"
              style={{ fontFamily: 'var(--font-cinzel)', color: '#3d2010' }}
            >
              {t('loginTitle')}
            </h1>
            <div
              className="mx-auto mt-3 h-[1px] w-24"
              style={{ background: 'linear-gradient(90deg, transparent, #c8922a, transparent)' }}
            />
          </div>

          {/* Card body */}
          <div className="px-8 py-6">
            {error ? (
              <div
                className="mb-4 rounded px-3 py-2.5 text-sm"
                style={{
                  background: 'rgba(185,28,28,0.08)',
                  border: '1px solid rgba(185,28,28,0.2)',
                  color: '#7f1d1d',
                  fontFamily: 'var(--font-crimson)',
                }}
              >
                {error}
              </div>
            ) : null}

            <form action={login} className="space-y-4">
              <GuildField id="email" name="email" type="email" label={t('email')} required />
              <GuildField id="password" name="password" type="password" label={t('password')} required />

              <button
                type="submit"
                className="mt-2 w-full rounded py-2.5 text-sm font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #c8922a, #a07020)',
                  color: '#1e0e04',
                  fontFamily: 'var(--font-cinzel)',
                  boxShadow: '0 3px 12px rgba(200,146,42,0.35)',
                }}
              >
                {t('loginAction')}
              </button>
            </form>

            {providers.length ? (
              <div
                className="mt-6 space-y-3 pt-6"
                style={{ borderTop: '1px solid rgba(180,140,80,0.2)' }}
              >
                <p
                  className="text-center text-xs uppercase tracking-[0.2em]"
                  style={{ color: '#8a7060', fontFamily: 'var(--font-cinzel)' }}
                >
                  {t('otherLoginOptions')}
                </p>
                {providers.map((provider) => (
                  <form key={provider.id} action={startAuth.bind(null, provider.id)}>
                    <button
                      type="submit"
                      disabled={!provider.enabled}
                      className="flex w-full items-center justify-center gap-2.5 rounded py-2.5 text-sm transition-all hover:brightness-95 disabled:opacity-50"
                      style={{
                        background: 'rgba(200,146,42,0.08)',
                        border: '1px solid rgba(200,146,42,0.25)',
                        color: '#5a3a20',
                        fontFamily: 'var(--font-crimson)',
                      }}
                    >
                      {provider.id === 'guancha' ? (
                        <img src="/watcha-logo.webp" alt="" width={20} height={20} className="shrink-0" />
                      ) : null}
                      <span>{t(provider.actionKey)}</span>
                      {provider.comingSoon ? <span> · {t('comingSoon')}</span> : null}
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div
            className="px-8 py-4 text-center"
            style={{ borderTop: '1px solid rgba(180,140,80,0.15)', background: 'rgba(200,146,42,0.03)' }}
          >
            <p
              className="text-sm"
              style={{ color: '#8a7060', fontFamily: 'var(--font-crimson)' }}
            >
              {t('noAccount')}{' '}
              <Link
                href="/auth/register"
                className="font-semibold transition-colors hover:text-[#c8922a]"
                style={{ color: '#8b5e1a' }}
              >
                {t('registerAction')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuildField({
  id,
  name,
  type,
  label,
  required,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
        style={{ color: '#8a7060', fontFamily: 'var(--font-cinzel)' }}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className="guild-input w-full rounded px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: 'rgba(245,234,210,0.6)',
          border: '1px solid rgba(180,140,80,0.35)',
          color: '#3d2010',
          fontFamily: 'var(--font-crimson)',
          fontSize: '1rem',
        }}
      />
    </div>
  );
}
