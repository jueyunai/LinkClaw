import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

function LoginForm({ error }: { error?: string }) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{t('loginTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              {t('loginAction')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/auth/register" className="text-primary underline underline-offset-4">
              {t('registerAction')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
