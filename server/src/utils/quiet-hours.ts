import { formatInTimeZone } from 'date-fns-tz';

export interface QuietHoursConfig {
  timezone: string; // IANA e.g. 'Africa/Lagos' or 'America/New_York'
  enabled?: boolean;
  startStr: string; // "22:00"
  endStr: string;   // "06:00"
}

/**
 * Checks whether the current moment falls within a user's quiet hours window.
 * Supports windows that cross midnight (e.g. 22:00 to 06:00) as well as daytime windows.
 */
export function isWithinQuietHours(now: Date, config: QuietHoursConfig): boolean {
  if (config.enabled === false) {
    return false;
  }

  const tz = config.timezone || 'Africa/Lagos';
  let currentHHmm: string;
  try {
    currentHHmm = formatInTimeZone(now, tz, 'HH:mm');
  } catch {
    // Fallback to UTC if timezone string is invalid
    currentHHmm = formatInTimeZone(now, 'UTC', 'HH:mm');
  }

  const { startStr, endStr } = config;

  if (startStr > endStr) {
    // Spans midnight (e.g. 22:00 to 06:00)
    return currentHHmm >= startStr || currentHHmm < endStr;
  } else if (startStr < endStr) {
    // Daytime window within same day (e.g. 13:00 to 15:00)
    return currentHHmm >= startStr && currentHHmm < endStr;
  } else {
    // start === end means disabled
    return false;
  }
}

/**
 * Calculates milliseconds until quietHoursEnd in the user's timezone.
 */
export function calculateDelayUntilQuietEnd(now: Date, config: QuietHoursConfig): number {
  const tz = config.timezone || 'Africa/Lagos';

  let currentHour: number;
  let currentMinute: number;
  let currentSecond: number;

  try {
    const formatted = formatInTimeZone(now, tz, 'HH:mm:ss');
    const [h, m, s] = formatted.split(':').map(Number);
    currentHour = h;
    currentMinute = m;
    currentSecond = s;
  } catch {
    currentHour = now.getUTCHours();
    currentMinute = now.getUTCMinutes();
    currentSecond = now.getUTCSeconds();
  }

  const [endHour, endMin] = config.endStr.split(':').map(Number);

  const currentMinutes = currentHour * 60 + currentMinute;
  const targetMinutes = endHour * 60 + endMin;

  let diffMinutes: number;
  if (targetMinutes <= currentMinutes) {
    // End time occurs on the next calendar day
    diffMinutes = (1440 - currentMinutes) + targetMinutes;
  } else {
    // End time occurs later today
    diffMinutes = targetMinutes - currentMinutes;
  }

  const totalSeconds = diffMinutes * 60 - currentSecond;
  const delayMs = totalSeconds * 1000;

  return Math.max(delayMs, 1000);
}
