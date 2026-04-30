export default function LocaleLoading() {
  return (
    <main
      className="min-h-[calc(100vh-4rem)]"
      style={{ background: 'linear-gradient(180deg, #f5ead6 0%, #f8f2e4 40%, #f5ead6 100%)' }}
    >
      {/* Hero skeleton — matches guild announcement board */}
      <section>
        <div
          className="relative"
          style={{
            background: 'linear-gradient(180deg, #1e0e04 0%, #2e1508 50%, #3d1f0a 100%)',
            boxShadow: '0 8px 40px rgba(30,14,4,0.6)',
          }}
        >
          <div
            className="h-[3px]"
            style={{ background: 'linear-gradient(90deg, #3d1f0a 0%, #c8922a 15%, #f0c060 50%, #c8922a 85%, #3d1f0a 100%)' }}
          />
          <div className="mx-auto max-w-6xl px-8 py-12 md:py-16">
            <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
              <div className="animate-pulse space-y-4 w-full max-w-xl">
                {/* Eyebrow */}
                <div className="h-3 w-32 rounded-full" style={{ background: 'rgba(200,146,42,0.2)' }} />
                {/* Title */}
                <div className="h-12 w-64 rounded-lg" style={{ background: 'rgba(200,146,42,0.15)' }} />
                {/* Divider */}
                <div className="h-[1px] w-48" style={{ background: 'rgba(200,146,42,0.2)' }} />
                {/* Subtitle */}
                <div className="h-5 w-80 rounded-full" style={{ background: 'rgba(200,176,144,0.15)' }} />
                {/* Stats */}
                <div className="flex gap-3">
                  <div className="h-8 w-24 rounded" style={{ background: 'rgba(200,146,42,0.12)' }} />
                  <div className="h-8 w-28 rounded" style={{ background: 'rgba(200,146,42,0.08)' }} />
                </div>
              </div>
            </div>
          </div>
          <div
            className="h-[2px]"
            style={{ background: 'linear-gradient(90deg, #3d1f0a 0%, #c8922a 15%, #f0c060 50%, #c8922a 85%, #3d1f0a 100%)' }}
          />
        </div>
      </section>

      {/* Content skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* Sprite bubble skeleton */}
        <div className="flex items-start gap-4 animate-pulse">
          <div
            className="size-11 shrink-0 rounded-full"
            style={{ background: 'rgba(200,146,42,0.2)' }}
          />
          <div
            className="flex-1 rounded-lg px-4 py-3 space-y-2"
            style={{ background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.15)' }}
          >
            <div className="h-3 w-20 rounded-full" style={{ background: 'rgba(200,146,42,0.15)' }} />
            <div className="h-4 w-3/4 rounded-full" style={{ background: 'rgba(200,146,42,0.1)' }} />
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #fdf8f0 0%, #f8f0e0 100%)',
                border: '1px solid rgba(180,140,80,0.2)',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {/* Rank bar */}
              <div className="flex flex-col pl-4">
                <div className="px-4 pt-4 pb-3 space-y-3">
                  {/* Badges */}
                  <div className="flex gap-2">
                    <div className="h-5 w-14 rounded" style={{ background: 'rgba(200,146,42,0.12)' }} />
                    <div className="h-5 w-16 rounded" style={{ background: 'rgba(200,146,42,0.08)' }} />
                  </div>
                  {/* Title */}
                  <div className="h-5 w-3/4 rounded" style={{ background: 'rgba(61,31,10,0.08)' }} />
                  {/* Description */}
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-full rounded-full" style={{ background: 'rgba(90,58,32,0.06)' }} />
                    <div className="h-3.5 w-5/6 rounded-full" style={{ background: 'rgba(90,58,32,0.06)' }} />
                  </div>
                </div>
                {/* Divider */}
                <div className="mx-4 h-[1px]" style={{ background: 'rgba(180,140,80,0.15)' }} />
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 px-4 py-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-1">
                      <div className="h-2.5 w-12 rounded-full" style={{ background: 'rgba(138,112,96,0.12)' }} />
                      <div className="h-3.5 w-20 rounded-full" style={{ background: 'rgba(61,31,10,0.06)' }} />
                    </div>
                  ))}
                </div>
                {/* Button */}
                <div className="px-4 pb-4">
                  <div className="h-9 w-full rounded" style={{ background: 'rgba(200,146,42,0.08)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
