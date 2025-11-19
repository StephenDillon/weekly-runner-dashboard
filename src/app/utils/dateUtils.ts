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

export function getWeeksBack(count: number, endDate: Date): Date[] {
  const weeks: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(getWeekStartDate(i, endDate));
  }
  return weeks;
}
