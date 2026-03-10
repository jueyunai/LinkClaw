import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from './locale-switcher';
import { logout } from '@/app/[locale]/auth/actions';

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { role: string; display_name: string } | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .single();

    profile = data;
  }

  return <NavbarContent user={user} profile={profile} />;
}

function NavbarContent({
  user,
  profile,
}: {
  user: { id: string } | null;
  profile: { role: string; display_name: string } | null;
}) {
  const t = useTranslations('common');

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {t('appName')}
        </Link>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {user && profile ? (
            <>
              <Link href="/my-events">
                <Button variant="ghost" size="sm">
                  {profile.display_name}
                </Button>
              </Link>
              {profile.role === 'organizer' ? (
                <Link href="/events/new">
                  <Button size="sm">+</Button>
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
