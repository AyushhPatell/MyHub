import { addDays, getDay, startOfDay } from 'date-fns';
import type { Assignment, Course, Semester } from '../types';

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatUtcStamp(d: Date): string {
  const x = new Date(d.getTime());
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, '0');
  const day = String(x.getUTCDate()).padStart(2, '0');
  const h = String(x.getUTCHours()).padStart(2, '0');
  const min = String(x.getUTCMinutes()).padStart(2, '0');
  const sec = String(x.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${sec}Z`;
}

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const BYDAY: Record<string, string> = {
  Sunday: 'SU',
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
};

function firstWeekdayOnOrAfter(anchor: Date, weekdayIndex: number): Date {
  const start = startOfDay(anchor);
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    if (getDay(d) === weekdayIndex) return d;
  }
  return start;
}

function applyTime(d: Date, timeStr: string): Date {
  const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10));
  const out = new Date(d);
  out.setHours(hh || 0, mm || 0, 0, 0);
  return out;
}

function foldLine(line: string): string {
  const max = 73;
  if (line.length <= max) return line;
  let out = '';
  let rest = line;
  while (rest.length > max) {
    out += `${rest.slice(0, max)}\r\n `;
    rest = rest.slice(max);
  }
  return out + rest;
}

/**
 * Builds an iCalendar (.ics) file for Microsoft Outlook and other clients.
 * Includes assignment due times and weekly class meetings for the active semester.
 */
export function buildOutlookCalendarIcs(
  semester: Semester,
  courses: Course[],
  assignments: Assignment[]
): string {
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyHub//Outlook Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MyHub',
  ];

  const now = new Date();
  const stamp = formatUtcStamp(now);
  const semesterEnd = startOfDay(
    semester.endDate instanceof Date ? semester.endDate : new Date(semester.endDate)
  );
  const until = formatUtcStamp(addDays(semesterEnd, 1));

  let seq = 0;

  for (const a of assignments) {
    const course = courseById.get(a.courseId);
    const start = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const uid = `assign-${a.id}-${seq++}@myhub`;
    const summary = escapeIcsText(
      `${course?.courseCode || 'Course'} — ${a.name}`
    );
    const descParts = [
      course ? `${course.courseName}` : '',
      `Type: ${a.type}`,
      a.completedAt ? 'Completed' : 'Incomplete',
    ].filter(Boolean);
    const desc = escapeIcsText(descParts.join('\\n'));

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatUtcStamp(start)}`);
    lines.push(`DTEND:${formatUtcStamp(end)}`);
    lines.push(foldLine(`SUMMARY:${summary}`));
    if (desc) lines.push(foldLine(`DESCRIPTION:${desc}`));
    lines.push('END:VEVENT');
  }

  const semStart = semester.startDate instanceof Date
    ? semester.startDate
    : new Date(semester.startDate);

  for (const course of courses) {
    for (const block of course.schedule || []) {
      const wd = DAY_INDEX[block.day];
      if (wd === undefined) continue;
      const first = firstWeekdayOnOrAfter(semStart, wd);
      if (first > semesterEnd) continue;

      const startLocal = applyTime(first, block.startTime);
      const endLocal = applyTime(first, block.endTime);
      const uid = `class-${course.id}-${block.day}-${block.startTime}-${seq++}@myhub`;
      const loc = block.location ? escapeIcsText(block.location) : '';
      const summary = escapeIcsText(`${course.courseCode} — ${course.courseName}`);
      const by = BYDAY[block.day];
      if (!by) continue;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${formatUtcStamp(startLocal)}`);
      lines.push(`DTEND:${formatUtcStamp(endLocal)}`);
      lines.push(foldLine(`SUMMARY:${summary}`));
      lines.push(foldLine(`RRULE:FREQ=WEEKLY;BYDAY=${by};UNTIL=${until}`));
      if (loc) lines.push(foldLine(`LOCATION:${loc}`));
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
