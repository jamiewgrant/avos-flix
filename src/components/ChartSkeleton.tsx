export function ChartSkeleton() {
  return (
    <div className="h-[360px] relative overflow-hidden rounded-lg">
      <div className="absolute inset-0 grid grid-rows-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="border-b border-dashed border-(--color-border) opacity-30" />
        ))}
      </div>
      <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path
          d="M0,260 Q60,250 120,230 T240,180 T360,140 T480,100 T600,60"
          fill="none"
          stroke="#c084fc"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        >
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.8s" repeatCount="indefinite" />
        </path>
        <path
          d="M0,300 Q90,290 150,275 T300,240 T450,210 T600,180"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        >
          <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2.2s" repeatCount="indefinite" />
        </path>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-xs text-(--color-muted) font-mono tracking-wider animate-pulse">
          fetching series…
        </div>
      </div>
    </div>
  )
}
