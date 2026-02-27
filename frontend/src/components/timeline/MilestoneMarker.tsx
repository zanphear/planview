interface MilestoneMarkerProps {
  left: number;
  height: number;
  name: string;
  colour: string;
}

export function MilestoneMarker({ left, height, name, colour }: MilestoneMarkerProps) {
  if (left < 0) return null;

  return (
    <div
      className="absolute top-0 z-10 pointer-events-none"
      style={{ left, height }}
    >
      <div className="w-0.5 h-full" style={{ backgroundColor: colour }} />
      <div
        className="absolute -top-5 -translate-x-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap text-white"
        style={{ backgroundColor: colour }}
      >
        {name}
      </div>
    </div>
  );
}
