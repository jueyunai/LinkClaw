import { Link } from '@/i18n/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-10">
      <Card className="w-full max-w-xl border-border/60 bg-card/85 shadow-xl backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto rounded-full border border-border/70 bg-muted/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary/80">
            404 · LinkClaw
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight md:text-4xl">
              页面不存在 / Page not found
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground md:text-base">
              你访问的页面可能已被移动，或当前还不存在。The page you are
              looking for may have moved or does not exist yet.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            返回首页 / Back home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
