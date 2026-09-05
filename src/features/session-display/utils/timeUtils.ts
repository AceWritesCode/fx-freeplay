// 96 immutable 15-minute intervals across 24 hours (00:00 to 23:45)
export const TIME_INTERVALS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

// Converts canonical "18:00" to "06:00 PM"
export function to12Hour(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

// Converts "06:00 PM", "6:00 pm", "18:00", or "9:00" to canonical "18:00"
export function to24Hour(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();

  // 12-hour match: "06:00 PM", "6:00pm", "12:15 AM", "3:01am"
  const match12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(trimmed);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toLowerCase();
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // 24-hour match: "18:00", "03:01", "9:00"
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  return trimmed;
}
