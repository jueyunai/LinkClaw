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
    <header className="border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold tracking-tight">
          <span>{t('appName')}</span>
          <span className="hidden rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1 text-[0.65rem] uppercase tracking-[0.22em] text-amber-900 sm:inline-flex">
            {tBounty('hall_title')}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {user && profile ? (
            <>
              <Link href="/my-events">
                <Button variant="ghost" size="sm" className="gap-2">
                  {profile.display_name}
                  {profile.role === 'guest' ? <RankBadge level={profile.hunter_level} /> : null}
                </Button>
              </Link>
              {profile.role === 'organizer' ? (
                <Link href="/events/new">
                  <Button size="sm">{tBounty('publish')}</Button>
                </Link>
              ) : null}
              <form action={logout}>
                <Button variant="ghost" size="sm" type="submit">
                  {t('logout')}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">{t('register')}</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
