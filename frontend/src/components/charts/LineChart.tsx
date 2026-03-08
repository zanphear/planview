interface DataPoint {
  label: string;
  value: number;
}

interface LineChartSeries {
  name: string;
  colour: string;
  data: DataPoint[];
}

interface LineChartProps {
  series: LineChartSeries[];
  height?: number;
  minY?: number;
  maxY?: number;
}

export function LineChart({ series, height = 160, minY, maxY }: LineChartProps) {
  const allValues = series.flatMap(s => s.data.map(d => d.value));
  if (allValues.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No data</span>
      </div>
    );
  }

  const yMin = minY ?? Math.min(...allValues);
  const yMax = maxY ?? Math.max(...allValues);
  const yRange = yMax - yMin || 1;
  const maxPoints = Math.max(...series.map(s => s.data.length));
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const width = 400;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const toX = (i: number) => padding.left + (maxPoints > 1 ? (i / (maxPoints - 1)) * chartW : chartW / 2);
  const toY = (v: number) => padding.top + chartH - ((v - yMin) / yRange) * chartH;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct);
        return (
          <line key={pct} x1={padding.left} y1={y} x2={width - padding.right} y2={y}
            stroke="var(--color-border)" strokeWidth={0.5} />
        );
      })}
      {/* Lines */}
      {series.map((s, si) => {
        const points = s.data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
        return (
          <g key={si}>
            <polyline points={points} fill="none" stroke={s.colour} strokeWidth={2} strokeLinejoin="round" />
            {s.data.map((d, i) => (
              <circle key={i} cx={toX(i)} cy={toY(d.value)} r={3} fill={s.colour}>
                <title>{s.name}: {d.value} ({d.label})</title>
              </circle>
            ))}
          </g>
        );
      })}
      {/* X labels */}
      {series[0]?.data.map((d, i) => (
        <text key={i} x={toX(i)} y={height - 4} textAnchor="middle" fontSize={9} fill="var(--color-text-secondary)">
          {d.label}
        </text>
      ))}
    </svg>
  );
}
