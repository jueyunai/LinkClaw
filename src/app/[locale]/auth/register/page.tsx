import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getVisibleAuthProviders } from '@/lib/auth';
import { Link } from '@/i18n/navigation';
import { register } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;

  return <RegisterForm error={error} />;
}

export function RegisterForm({ error }: { error?: string }) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const providers = getVisibleAuthProviders();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('registerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <form action={register} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{tc('appName')}</Label>
              <Input id="displayName" name="displayName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <div className="space-y-3">
              <Label>{t('selectRole')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="guest"
                    defaultChecked
                    className="peer sr-only"
                  />
                  <div className="rounded-xl border-2 border-muted p-4 text-center transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                    <p className="font-medium">{tc('guest')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('guestDesc')}
                    </p>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="organizer"
                    className="peer sr-only"
                  />
                  <div className="rounded-xl border-2 border-muted p-4 text-center transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                    <p className="font-medium">{tc('organizer')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('organizerDesc')}
                    </p>
                  </div>
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full">
              {t('registerAction')}
            </Button>
          </form>
          {providers.length ? (
            <div className="mt-6 space-y-3 border-t border-border/60 pt-6">
              <p className="text-center text-sm text-muted-foreground">
                {t('otherRegisterOptions')}
              </p>
              {providers.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!provider.enabled}
                >
                  {t(provider.actionKey)}
                  {provider.comingSoon ? ` · ${t('comingSoon')}` : null}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/auth/login" className="text-primary underline underline-offset-4">
              {t('loginAction')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
