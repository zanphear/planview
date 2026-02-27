import { addDays, differenceInDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, isWeekend, isToday, parseISO } from 'date-fns';

export type ZoomLevel = 'W' | 'M' | 'Q' | 'A';

export interface ZoomConfig {
  columnWidth: number;
  dateFormat: string;
  headerFormat: string;
  daysVisible: number;
}

export const ZOOM_CONFIGS: Record<ZoomLevel, ZoomConfig> = {
  W: { columnWidth: 120, dateFormat: 'EEE d', headerFormat: 'MMM yyyy', daysVisible: 14 },
  M: { columnWidth: 40, dateFormat: 'd', headerFormat: 'MMM yyyy', daysVisible: 35 },
  Q: { columnWidth: 14, dateFormat: '', headerFormat: 'MMM', daysVisible: 91 },
  A: { columnWidth: 4, dateFormat: '', headerFormat: 'MMM', daysVisible: 365 },
};

export function generateDateRange(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

export function getDateOffset(date: Date, rangeStart: Date): number {
  return differenceInDays(date, rangeStart);
}

export function getTaskSpan(dateFrom: string, dateTo: string, rangeStart: Date): { left: number; width: number } {
  const start = parseISO(dateFrom);
  const end = parseISO(dateTo);
  const left = getDateOffset(start, rangeStart);
  const width = differenceInDays(end, start) + 1;
  return { left, width };
}

export { addDays, differenceInDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, isWeekend, isToday, parseISO };
