export function ago(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function clock(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

/** "tomorrow 9am", "Sun 10am", "today 5:30pm", "Mar 3 8am". */
export function formatRemind(date: Date, now: Date = new Date()): string {
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
  let day: string;
  if (dayDiff === 0) day = 'today';
  else if (dayDiff === 1) day = 'tomorrow';
  else if (dayDiff > 1 && dayDiff < 7) day = WEEKDAYS[date.getDay()];
  else day = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return `${day} ${clock(date)}`;
}

export const hoursAgo = (h: number, now: Date = new Date()) => new Date(now.getTime() - h * 3600000);
