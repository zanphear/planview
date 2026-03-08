interface Bar {
  label: string;
  value: number;
  colour: string;
}

interface BarChartProps {
  bars: Bar[];
  maxValue?: number;
  height?: number;
}

export function BarChart({ bars, maxValue, height = 200 }: BarChartProps) {
  const max = maxValue ?? Math.max(...bars.map(b => b.value), 1);
  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No data</span>
      </div>
    );
  }

  const barWidth = Math.min(40, Math.floor(300 / bars.length));
  const gap = Math.max(4, Math.floor(barWidth / 3));
  const svgWidth = bars.length * (barWidth + gap);
  const chartHeight = height - 30;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="xMidYEnd meet">
      {bars.map((bar, i) => {
        const barHeight = (bar.value / max) * chartHeight;
        const x = i * (barWidth + gap);
        const y = chartHeight - barHeight;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} fill={bar.colour}>
              <title>{bar.label}: {bar.value}</title>
            </rect>
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="var(--color-text-secondary)">
              {bar.value}
            </text>
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize={9} fill="var(--color-text-secondary)">
              {bar.label.length > 8 ? bar.label.slice(0, 7) + '…' : bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
