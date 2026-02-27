import { format, isWeekend, isToday } from '../../utils/dates';
import type { ZoomLevel } from '../../utils/dates';
import { ZOOM_CONFIGS } from '../../utils/dates';

interface TimelineHeaderProps {
  dates: Date[];
  zoom: ZoomLevel;
}

export function TimelineHeader({ dates, zoom }: TimelineHeaderProps) {
  const config = ZOOM_CONFIGS[zoom];

  // Group dates by month for header row
  const months: { label: string; span: number }[] = [];
  let currentMonth = '';
  for (const date of dates) {
    const label = format(date, 'MMM yyyy');
    if (label !== currentMonth) {
      months.push({ label, span: 1 });
      currentMonth = label;
    } else {
      months[months.length - 1].span++;
    }
  }

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
      {/* Month row */}
      <div className="flex">
        <div className="w-48 shrink-0 border-r border-gray-200" />
        {months.map((month, i) => (
          <div
            key={i}
            className="text-xs font-medium text-gray-500 px-2 py-1 border-r border-gray-100 text-center"
            style={{ width: month.span * config.columnWidth }}
          >
            {month.label}
          </div>
        ))}
      </div>

      {/* Day row */}
      {(zoom === 'W' || zoom === 'M') && (
        <div className="flex">
          <div className="w-48 shrink-0 border-r border-gray-200" />
          {dates.map((date, i) => (
            <div
              key={i}
              className={`text-[10px] text-center py-1 border-r border-gray-100 ${
                isToday(date) ? 'bg-blue-50 font-bold text-blue-600' : isWeekend(date) ? 'bg-gray-50 text-gray-400' : 'text-gray-500'
              }`}
              style={{ width: config.columnWidth }}
            >
              {config.dateFormat ? format(date, config.dateFormat) : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
