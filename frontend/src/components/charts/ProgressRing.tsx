interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  colour?: string;
  label?: string;
}

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 5,
  colour = 'var(--color-primary)',
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  const center = size / 2;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text
          x={center}
          y={center + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size / 4}
          fontWeight="bold"
          fill="var(--color-text)"
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label && (
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
