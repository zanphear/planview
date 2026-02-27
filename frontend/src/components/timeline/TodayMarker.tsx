interface TodayMarkerProps {
  left: number;
  height: number;
}

export function TodayMarker({ left, height }: TodayMarkerProps) {
  if (left < 0) return null;

  return (
    <div
      className="absolute top-0 w-0.5 bg-red-400 z-10 pointer-events-none"
      style={{ left, height }}
    >
      <div className="w-2 h-2 bg-red-400 rounded-full -translate-x-[3px] -translate-y-1" />
    </div>
  );
}
