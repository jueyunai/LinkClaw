import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { RankBadge } from '@/components/features/rank-badge';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from './locale-switcher';
import { logout } from '@/app/[locale]/auth/actions';
import type { HunterLevel, UserRole } from '@/types/database';

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { role: UserRole; display_name: string; hunter_level: HunterLevel } | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, display_name, hunter_level')
      .eq('id', user.id)
      .single();

    profile = data as { role: UserRole; display_name: string; hunter_level: HunterLevel } | null;
  }

  return <NavbarContent user={user} profile={profile} />;
}

function NavbarContent({
  user,
  profile,
}: {
  user: { id: string } | null;
  profile: { role: UserRole; display_name: string; hunter_level: HunterLevel } | null;
}) {
  const t = useTranslations('common');
  const tBounty = useTranslations('bounty');

  return (
    <header
      className="relative border-b border-[#5a3010]/40"
      style={{
        background: 'linear-gradient(180deg, #2a1206 0%, #3a1a08 100%)',
        boxShadow: '0 2px 16px rgba(61,31,10,0.45), inset 0 -1px 0 rgba(200,146,42,0.2)',
      }}
    >
      {/* Top gold accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #c8922a 20%, #f0c060 50%, #c8922a 80%, transparent 100%)' }}
      />

      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          {/* Wax seal icon */}
          <div
            className="flex size-9 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #c8922a, #8b5e1a)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,220,120,0.3)',
              color: '#2a1206',
              fontFamily: 'var(--font-cinzel)',
            }}
          >
            LC
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-base font-bold tracking-widest"
              style={{ fontFamily: 'var(--font-cinzel)', color: '#f0c060' }}
            >
              LinkClaw
            </span>
            <span
              className="hidden text-[0.6rem] uppercase tracking-[0.3em] sm:block"
              style={{ color: '#c8922a' }}
            >
              {tBounty('hall_title')}
            </span>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />

          {user && profile ? (
            <>
              <Link href="/my-events">
                <button
                  className="flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
                  style={{ color: '#e8d5a8', fontFamily: 'var(--font-crimson)' }}
                >
                  <span>{profile.display_name}</span>
                  {profile.role === 'guest' ? <RankBadge level={profile.hunter_level} /> : (
                    <span
                      className="rounded px-2 py-0.5 text-[0.6rem] uppercase tracking-widest"
                      style={{ background: 'rgba(200,146,42,0.15)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.3)' }}
                    >
                      {tBounty('commissioner')}
                    </span>
                  )}
                </button>
              </Link>

              {profile.role === 'organizer' ? (
                <Link href="/events/new">
                  <button
                    className="rounded px-4 py-1.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #c8922a, #a07020)',
                      color: '#2a1206',
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.08em',
                      boxShadow: '0 2px 8px rgba(200,146,42,0.3)',
                    }}
                  >
                    {tBounty('publish')}
                  </button>
                </Link>
              ) : null}

              <form action={logout}>
                <button
                  type="submit"
                  className="rounded px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                  style={{ color: '#8a7060' }}
                >
                  {t('logout')}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <button
                  className="rounded px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
                  style={{ color: '#c8b090', fontFamily: 'var(--font-crimson)' }}
                >
                  {t('login')}
                </button>
              </Link>
              <Link href="/auth/register">
                <button
                  className="rounded px-4 py-1.5 text-sm font-semibold transition-all hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #c8922a, #a07020)',
                    color: '#2a1206',
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    boxShadow: '0 2px 8px rgba(200,146,42,0.3)',
                  }}
                >
                  {t('register')}
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Bottom decorative border */}
      <div
        className="absolute inset-x-0 bottom-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(200,146,42,0.4) 30%, rgba(200,146,42,0.6) 50%, rgba(200,146,42,0.4) 70%, transparent 100%)' }}
      />
    </header>
  );
}
