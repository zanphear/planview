interface TodayMarkerProps {
  left: number;
  height: number;
}

export function TodayMarker({ left, height }: TodayMarkerProps) {
  if (left < 0) return null;

  return (
    <div
      className="absolute top-0 w-0.5 z-10 pointer-events-none"
      style={{ left, height, backgroundColor: 'var(--color-danger)' }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full -translate-x-[4px] -translate-y-1"
        style={{ backgroundColor: 'var(--color-danger)' }}
      />
    </div>
  );
}
