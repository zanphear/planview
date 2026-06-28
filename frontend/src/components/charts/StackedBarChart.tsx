interface StackedSegment {
  label: string;
  value: number;
  colour: string;
}

interface StackedBar {
  label: string;
  segments: StackedSegment[];
}

interface StackedBarChartProps {
  bars: StackedBar[];
  barHeight?: number;
}

export function StackedBarChart({ bars, barHeight = 24 }: StackedBarChartProps) {
  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          No data
        </span>
      </div>
    );
  }

  const maxTotal = Math.max(...bars.map((b) => b.segments.reduce((s, seg) => s + seg.value, 0)), 1);

  return (
    <div className="space-y-2">
      {bars.map((bar, i) => {
        const total = bar.segments.reduce((s, seg) => s + seg.value, 0);
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className="text-xs w-20 truncate shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
              title={bar.label}
            >
              {bar.label}
            </span>
            <div className="flex-1">
              <svg width="100%" height={barHeight} preserveAspectRatio="none">
                {(() => {
                  let x = 0;
                  return bar.segments.map((seg, j) => {
                    const pct = (seg.value / maxTotal) * 100;
                    const el = (
                      <rect
                        key={j}
                        x={`${x}%`}
                        y={0}
                        width={`${pct}%`}
                        height={barHeight}
                        rx={j === 0 ? 3 : 0}
                        fill={seg.colour}
                      >
                        <title>
                          {seg.label}: {seg.value}
                        </title>
                      </rect>
                    );
                    x += pct;
                    return el;
                  });
                })()}
              </svg>
            </div>
            <span
              className="text-xs w-8 text-right shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
