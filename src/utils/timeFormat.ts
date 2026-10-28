/**
 * B&B Family Salon - Centralized Time & Date Formatting Utility
 * Enforces 12-hour format with AM/PM across Indian Standard Time (IST, Asia/Kolkata, UTC+05:30).
 */

/**
 * Converts any time string (e.g. "14:30", "09:05", "14:30:00", "2:30 PM")
 * into clean 12-hour format with AM/PM (e.g. "2:30 PM", "9:05 AM").
 */
export function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (!trimmed) return '';

  // If already formatted with AM/PM, normalize spacing
  if (/[ap]m/i.test(trimmed)) {
    return trimmed.replace(/\s*([ap]m)/i, ' $1').toUpperCase();
  }

  // Handle ISO string if passed
  if (trimmed.includes('T')) {
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).toUpperCase();
      }
    } catch {}
  }

  // Parse "HH:MM" or "HH:MM:SS"
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      const mStr = String(minutes).padStart(2, '0');
      return `${h12}:${mStr} ${period}`;
    }
  }

  return trimmed;
}

/**
 * Formats a time range in 12-hour AM/PM format.
 * Example: ("14:30", "15:15") -> "2:30 PM - 3:15 PM"
 * Example: ("14:30", "") -> "2:30 PM"
 */
export function formatTimeRange12(startTime?: string | null, endTime?: string | null): string {
  const start = formatTime12(startTime);
  const end = formatTime12(endTime);
  if (start && end && start !== end) {
    return `${start} - ${end}`;
  }
  return start || end || '';
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into readable IST date.
 * Example: "2026-10-30" -> "30 Oct 2026"
 */
export function formatDateIST(dateStr?: string | null, options?: { includeWeekday?: boolean }): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  try {
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, day] = trimmed.split('-').map(Number);
      // Construct in local calendar
      d = new Date(y, m - 1, day, 12, 0, 0);
    } else {
      d = new Date(trimmed);
    }

    if (isNaN(d.getTime())) return trimmed;

    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: options?.includeWeekday ? 'short' : undefined,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return trimmed;
  }
}

/**
 * Formats appointment schedule combining date and 12-hour time.
 * Example: ("2026-10-30", "14:30", "15:15") -> "30 Oct 2026 · 2:30 PM - 3:15 PM"
 */
export function formatAppointmentSchedule(
  dateStr?: string | null,
  timeStr?: string | null,
  endTimeStr?: string | null
): string {
  const dateFormatted = formatDateIST(dateStr);
  const timeFormatted = formatTimeRange12(timeStr, endTimeStr);
  if (dateFormatted && timeFormatted) {
    return `${dateFormatted} · ${timeFormatted}`;
  }
  return dateFormatted || timeFormatted || '';
}

/**
 * Converts a database timestamp (ISO UTC or similar) to full Indian Standard Time (IST) string.
 * Example: "2026-10-27T10:15:00.000Z" -> "27 Oct 2026, 3:45 PM IST"
 */
export function formatTimestampIST(isoStr?: string | null): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);

    const datePart = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const timePart = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();

    return `${datePart}, ${timePart} IST`;
  } catch {
    return String(isoStr);
  }
}

/**
 * Converts a time string (e.g. "10:00", "10:00 AM", "14:30", "2:30 PM")
 * into total minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const trimmed = String(timeStr).trim();
  if (!trimmed) return 0;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  }
  return 0;
}

/**
 * Returns current date and time in Indian Standard Time (IST, Asia/Kolkata).
 */
export function getCurrentIST() {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  return {
    date: istDate,
    dateStr,
    hours,
    minutes,
    totalMinutes
  };
}

export interface AppointmentTemporalStatus {
  isToday: boolean;
  isPastDate: boolean;
  isFutureDate: boolean;
  isTimePassed: boolean;
  isInProgress: boolean;
  isUpcoming: boolean;
  isOverdueActionNeeded: boolean;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Determines whether an appointment is in the past, in progress, upcoming,
 * or has passed its scheduled time without status being marked completed/cancelled.
 */
export function getAppointmentTemporalStatus(
  appt: {
    date?: string | null;
    time?: string | null;
    endTime?: string | null;
    serviceDuration?: number | string | null;
    status?: string | null;
  },
  referenceIST?: { dateStr: string; totalMinutes: number }
): AppointmentTemporalStatus {
  const ist = referenceIST || getCurrentIST();
  const apptDateStr = String(appt.date || '').trim();
  const isToday = apptDateStr === ist.dateStr;
  const isPastDate = apptDateStr < ist.dateStr;
  const isFutureDate = apptDateStr > ist.dateStr;

  const startMinutes = parseTimeToMinutes(appt.time);
  let endMinutes = parseTimeToMinutes(appt.endTime);
  if (endMinutes <= startMinutes) {
    const dur = Number(appt.serviceDuration) || 30;
    endMinutes = startMinutes + dur;
  }

  const isCompleted = appt.status === 'completed';
  const isCancelled = appt.status === 'cancelled' || (appt.status as string) === 'rejected';

  // Has scheduled slot passed?
  // If appointment is for today, it has passed if current IST time >= endMinutes.
  // If appointment is on a past date, it has definitely passed.
  const isTimePassed = isPastDate || (isToday && ist.totalMinutes >= endMinutes);

  // In progress: Only for today, when clock is between start and end time, and not completed/cancelled
  const isInProgress = isToday && ist.totalMinutes >= startMinutes && ist.totalMinutes < endMinutes && !isCompleted && !isCancelled;

  // Truly upcoming: Future date OR today with start time > current clock, and not completed/cancelled
  const isUpcoming = (isFutureDate || (isToday && startMinutes > ist.totalMinutes)) && !isCompleted && !isCancelled;

  // Overdue / Action Needed: Scheduled time has passed, but status is still pending, confirmed, postponed, etc. (NOT marked completed or cancelled)
  const isOverdueActionNeeded = isTimePassed && !isCompleted && !isCancelled;

  return {
    isToday,
    isPastDate,
    isFutureDate,
    isTimePassed,
    isInProgress,
    isUpcoming,
    isOverdueActionNeeded,
    startMinutes,
    endMinutes
  };
}
