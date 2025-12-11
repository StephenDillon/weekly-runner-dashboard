export type WeekStartDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

const DAY_TO_NUMBER: Record<WeekStartDay, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

export function getLastFullWeek(weekStartsOn: WeekStartDay = 'Monday'): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const startDayNum = DAY_TO_NUMBER[weekStartsOn];

  let daysToLastStart;
  if (dayOfWeek >= startDayNum) {
    daysToLastStart = dayOfWeek - startDayNum;
  } else {
    daysToLastStart = 7 - (startDayNum - dayOfWeek);
  }

  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - daysToLastStart);
  currentWeekStart.setHours(0, 0, 0, 0);
  return currentWeekStart;
}

export function getWeekStartDate(weeksBack: number, endDate: Date): Date {
  const date = new Date(endDate);
  date.setDate(date.getDate() - (weeksBack * 7));
  return date;
}

export function formatWeekLabel(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

const DAY_ABBREVIATIONS: Record<WeekStartDay, string> = {
  'Sunday': 'Sun',
  'Monday': 'Mon',
  'Tuesday': 'Tue',
  'Wednesday': 'Wed',
  'Thursday': 'Thu',
  'Friday': 'Fri',
  'Saturday': 'Sat'
};

export function formatWeekTooltip(date: Date, weekStartsOn: WeekStartDay = 'Monday'): string {
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(startDate.getDate() + 6);

  const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  const dayName = DAY_ABBREVIATIONS[weekStartsOn];

  if (startMonth === endMonth) {
    return `${dayName} ${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    return `${dayName} ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

// Generate array of week start dates (Sundays) going back from endDate
export function getWeeksBack(count: number, endDate: Date): Date[] {
  const weeks: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(getWeekStartDate(i, endDate));
  }
  return weeks;
}

export function getLastFullMonth(): Date {
  const today = new Date();
  // Get the first day of the current month
  const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  // Subtract 1 day to get the last day of the previous month
  const lastDayOfLastMonth = new Date(firstDayOfCurrentMonth);
  lastDayOfLastMonth.setDate(0);
  // Set to midnight
  lastDayOfLastMonth.setHours(0, 0, 0, 0);
  return lastDayOfLastMonth;
}

export function getMonthStartDate(monthsBack: number, endDate: Date): Date {
  // endDate is expected to be the last day of a month (or close to it)
  // We want to find the start of the month 'monthsBack' months ago
  const targetDate = new Date(endDate);
  targetDate.setDate(1); // Set to first of the end month
  targetDate.setMonth(targetDate.getMonth() - monthsBack);
  return targetDate;
}

export function getMonthsBack(count: number, endDate: Date): Date[] {
  const months: Date[] = [];
  // endDate is the end of the last month to include
  // e.g., if endDate is Dec 31, and count is 3, we want [Oct 1, Nov 1, Dec 1]

  // Start from the month of the endDate
  const currentMonthEnd = new Date(endDate);
  // Ensure we are working with the start of that month for the array
  const currentMonthStart = new Date(currentMonthEnd.getFullYear(), currentMonthEnd.getMonth(), 1);

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(currentMonthStart);
    d.setMonth(d.getMonth() - i);
    months.push(d);
  }
  return months;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function formatMonthTooltip(date: Date): string {
  // date is start of month
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// Parses a date string (YYYY-MM-DD or partial ISO) and returns a Date object 
// set to midnight local time to avoid timezone shifts.
export function parseRaceDate(dateString: string): Date {
  if (!dateString) return new Date();

  // Extract YYYY-MM-DD regardless of what follows (T, space, etc)
  // This explicitly ignores any time or timezone info in the string
  const datePart = String(dateString).split('T')[0].split(' ')[0];
  const parts = datePart.split('-');

  if (parts.length < 3) return new Date(dateString); // Fallback

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  return new Date(year, month, day);
}
