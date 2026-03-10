export default function LocaleLoading() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-10">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-border/60 bg-card/70 p-8 shadow-xl backdrop-blur">
        <div className="space-y-6 animate-pulse">
          <div className="h-4 w-28 rounded-full bg-muted" />
          <div className="space-y-3">
            <div className="h-10 w-3/4 rounded-2xl bg-muted" />
            <div className="h-4 w-full rounded-full bg-muted" />
            <div className="h-4 w-5/6 rounded-full bg-muted" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-28 rounded-2xl bg-muted/80" />
            <div className="h-28 rounded-2xl bg-muted/80" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-muted" />
        </div>
      </div>
    </main>
  );
}
