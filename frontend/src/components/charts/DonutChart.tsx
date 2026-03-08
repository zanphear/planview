interface Segment {
  label: string;
  value: number;
  colour: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({ segments, size = 120, strokeWidth = 16, centerLabel, centerValue }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No data</span>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let accumulated = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
      {/* Segments */}
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dashLength = pct * circumference;
        const dashOffset = -accumulated * circumference + circumference * 0.25;
        accumulated += pct;
        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.colour}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
          >
            <title>{seg.label}: {seg.value}</title>
          </circle>
        );
      })}
      {/* Center text */}
      {centerValue !== undefined && (
        <>
          <text x={center} y={centerLabel ? center - 4 : center + 2} textAnchor="middle" dominantBaseline="middle"
            fontSize={size / 5} fontWeight="bold" fill="var(--color-text)">{centerValue}</text>
          {centerLabel && (
            <text x={center} y={center + 12} textAnchor="middle" dominantBaseline="middle"
              fontSize={size / 10} fill="var(--color-text-secondary)">{centerLabel}</text>
          )}
        </>
      )}
    </svg>
  );
}
