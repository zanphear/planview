import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday, addMonths, subMonths, parseISO,
} from 'date-fns';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { timeEntriesApi, type Absence } from '../api/timeEntries';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function AbsenceCalendarPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    setLoading(true);
    timeEntriesApi.absences(workspace.id, {
      since: format(calStart, 'yyyy-MM-dd'),
      until: format(calEnd, 'yyyy-MM-dd'),
    }).then(({ data }) => setAbsences(data))
      .catch(() => setAbsences([]))
      .finally(() => setLoading(false));
  }, [workspace, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const absencesByDate = useMemo(() => {
    const map = new Map<string, Absence[]>();
    for (const absence of absences) {
      const start = parseISO(absence.start_date);
      const end = parseISO(absence.end_date);
      const rangeDays = eachDayOfInterval({ start, end });
      for (const d of rangeDays) {
        const key = format(d, 'yyyy-MM-dd');
        const existing = map.get(key) || [];
        if (!existing.find(a => a.id === absence.id)) {
          existing.push(absence);
        }
        map.set(key, existing);
      }
    }
    return map;
  }, [absences]);

  // Unique people for the list view
  const uniquePeople = useMemo(() => {
    const map = new Map<string, Absence[]>();
    for (const a of absences) {
      const existing = map.get(a.user_id) || [];
      existing.push(a);
      map.set(a.user_id, existing);
    }
    return Array.from(map.entries()).map(([userId, items]) => ({
      userId,
      userName: items[0].user_name,
      userColour: items[0].user_colour,
      userInitials: items[0].user_initials,
      userAvatarUrl: items[0].user_avatar_url,
      absences: items,
    }));
  }, [absences]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Absence Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: 'var(--color-text)' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-xs font-medium text-center border-b"
              style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-grey-1)' }}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-[repeat(auto-fill,minmax(80px,1fr))]">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayAbsences = absencesByDate.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={key}
                className="min-h-[80px] border-b border-r p-1.5"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: isToday(day) ? 'var(--color-primary-light, rgba(65,134,224,0.08))' : 'transparent',
                  opacity: inMonth ? 1 : 0.4,
                }}
              >
                <div className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-accent font-bold' : ''}`} style={{ color: isToday(day) ? undefined : 'var(--color-text-secondary)' }}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayAbsences.slice(0, 3).map((absence) => (
                    <div
                      key={absence.id}
                      className="px-1.5 py-0.5 rounded text-[10px] truncate"
                      style={{ backgroundColor: absence.colour + '20', color: absence.colour }}
                      title={`${absence.user_name}, ${absence.label}`}
                    >
                      {absence.user_name?.split(' ')[0]}
                    </div>
                  ))}
                  {dayAbsences.length > 3 && (
                    <div className="text-[10px] px-1" style={{ color: 'var(--color-text-secondary)' }}>
                      +{dayAbsences.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* People list */}
      {uniquePeople.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            People off this month ({uniquePeople.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {uniquePeople.map((person) => (
              <div
                key={person.userId}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                  style={{ backgroundColor: person.userColour }}
                >
                  {person.userInitials || person.userName?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {person.userName}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {person.absences.map((a) => a.label).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {absences.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No absences recorded for this period.
          </p>
        </div>
      )}
    </div>
  );
}
