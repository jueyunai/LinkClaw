import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function getCopy(locale: string) {
  if (locale === 'en') {
    return {
      title: 'Verify your email',
      description: 'We have sent a verification email to the address below. Please open your inbox and click the link in the email before logging in.',
      inboxHint: 'If you do not see the email, please check your spam folder.',
      loginAction: 'Go to login',
      registerAction: 'Use another email',
      emailLabel: 'Email address',
    };
  }

  return {
    title: '请验证你的邮箱',
    description: '我们已向下方邮箱发送验证邮件。请先打开邮箱并点击邮件中的验证链接，再返回登录。',
    inboxHint: '如果暂时没有收到邮件，请检查垃圾邮件或稍后重试。',
    loginAction: '前往登录',
    registerAction: '换个邮箱注册',
    emailLabel: '接收邮箱',
  };
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  const { email } = await searchParams;

  setRequestLocale(locale);

  const copy = getCopy(locale);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{copy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{copy.description}</p>
          <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
              {copy.emailLabel}
            </p>
            <p className="mt-1 break-all text-sm font-medium text-foreground">
              {email ?? '-'}
            </p>
          </div>
          <p>{copy.inboxHint}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link
            className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80"
            href="/auth/login"
          >
            {copy.loginAction}
          </Link>
          <Link
            className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
            href="/auth/register"
          >
            {copy.registerAction}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
