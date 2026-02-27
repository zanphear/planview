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
    <div className="sticky top-0 z-20 border-b" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Month row */}
      <div className="flex">
        <div className="w-48 shrink-0 border-r" style={{ borderColor: 'var(--color-border)' }} />
        {months.map((month, i) => (
          <div
            key={i}
            className="text-xs font-medium px-2 py-1 border-r text-center"
            style={{ width: month.span * config.columnWidth, color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
          >
            {month.label}
          </div>
        ))}
      </div>

      {/* Day row */}
      {(zoom === 'W' || zoom === 'M') && (
        <div className="flex">
          <div className="w-48 shrink-0 border-r" style={{ borderColor: 'var(--color-border)' }} />
          {dates.map((date, i) => (
            <div
              key={i}
              className={`text-[10px] text-center py-1 border-r ${
                isToday(date) ? 'font-bold' : ''
              }`}
              style={{
                width: config.columnWidth,
                borderColor: 'var(--color-border)',
                backgroundColor: isToday(date) ? 'var(--color-primary-light)' : isWeekend(date) ? 'var(--color-grey-1)' : undefined,
                color: isToday(date) ? 'var(--color-primary)' : isWeekend(date) ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
              }}
            >
              {config.dateFormat ? format(date, config.dateFormat) : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
