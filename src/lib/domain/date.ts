// ============================================================
// Date utilities — dateKey, periods, timezone handling
// Uses date-fns and date-fns-tz
// ============================================================

import { format, startOfDay, startOfMonth, subDays, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { BillType, WeeklyStartDay } from '@/lib/types';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Get the YYYY-MM-DD dateKey for a given date in the specified timezone.
 */
export function getDateKey(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Get today's dateKey in the specified timezone.
 */
export function getTodayKey(timezone: string = DEFAULT_TIMEZONE): string {
  return getDateKey(new Date(), timezone);
}

/**
 * Parse a dateKey string to a Date at midnight in the timezone.
 */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a dateKey for display: "12 Nov 2026"
 */
export function formatDateDisplay(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return format(date, 'dd MMM yyyy');
}

/**
 * Format a Date for display: "12 Nov 2026"
 */
export function formatDate(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'dd MMM yyyy');
}

/**
 * Get day of week: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
 * (Matches iOS app convention)
 */
function getDayOfWeek(date: Date): WeeklyStartDay {
  // JS: 0=Sun, 1=Mon, ..., 6=Sat → iOS: 1=Sun, ..., 7=Sat
  return (date.getDay() + 1) as WeeklyStartDay;
}

/**
 * Get period bounds (start and end dateKeys, both inclusive) for a bill type.
 *
 * @param billType - 'today', 'weekly', or 'monthly'
 * @param weeklyStartDay - 1=Sunday through 7=Saturday
 * @param timezone - IANA timezone
 * @param referenceDate - The reference "now" date (defaults to new Date())
 * @returns { startKey, endKey } both inclusive YYYY-MM-DD strings
 */
export function getPeriodBounds(
  billType: BillType,
  weeklyStartDay: WeeklyStartDay = 1,
  timezone: string = DEFAULT_TIMEZONE,
  referenceDate: Date = new Date()
): { startKey: string; endKey: string } {
  const zonedNow = toZonedTime(referenceDate, timezone);
  const todayKey = format(zonedNow, 'yyyy-MM-dd');

  switch (billType) {
    case 'today':
      return { startKey: todayKey, endKey: todayKey };

    case 'weekly': {
      // Find the most recent occurrence of weeklyStartDay
      const currentDow = getDayOfWeek(zonedNow); // 1-7
      let daysBack = currentDow - weeklyStartDay;
      if (daysBack < 0) daysBack += 7;
      const weekStart = startOfDay(subDays(zonedNow, daysBack));
      const startKey = format(weekStart, 'yyyy-MM-dd');
      return { startKey, endKey: todayKey };
    }

    case 'monthly': {
      const monthStart = startOfMonth(zonedNow);
      const startKey = format(monthStart, 'yyyy-MM-dd');
      return { startKey, endKey: todayKey };
    }

    default:
      return { startKey: todayKey, endKey: todayKey };
  }
}

/**
 * Check if a dateKey falls within a range (inclusive on both ends).
 */
export function isDateKeyInRange(
  dateKey: string,
  startKey: string,
  endKey: string
): boolean {
  return dateKey >= startKey && dateKey <= endKey;
}

/**
 * Check if a dateKey is before a given key (exclusive).
 */
export function isDateKeyBefore(dateKey: string, beforeKey: string): boolean {
  return dateKey < beforeKey;
}

/**
 * Get a human-readable period label.
 */
export function getPeriodLabel(
  billType: BillType,
  startKey: string,
  endKey: string
): string {
  switch (billType) {
    case 'today':
      return `Today (${formatDateDisplay(endKey)})`;
    case 'weekly':
      return `Weekly (${formatDateDisplay(startKey)} – ${formatDateDisplay(endKey)})`;
    case 'monthly':
      return `Monthly (${formatDateDisplay(startKey)} – ${formatDateDisplay(endKey)})`;
    default:
      return '';
  }
}

/**
 * Format a date for use in WhatsApp text.
 */
export function formatDateForWhatsApp(dateKey: string): string {
  return formatDateDisplay(dateKey);
}

/**
 * Get an array of dateKeys from startKey to endKey (inclusive).
 */
export function getDateRange(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let current = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  while (current <= end) {
    keys.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }

  return keys;
}
