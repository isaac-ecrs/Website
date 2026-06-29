import type { TimeSlot } from './models';

// Known venue locations — update when the retreat facility changes.
export const KNOWN_LOCATIONS: string[] = [
  'Chapel A',
  'Craft Room',
  'Dining Room',
  'Elm Room',
  'Library',
  'Martin Room',
  'Rec Hall',
];

// Canonical WA schedule defaults. Update times here when they change year to year.
// Order matters: this defines the display order in all generated documents.
export const DEFAULT_TIMESLOTS: TimeSlot[] = [
  {
    periodKey: 'custom-breakfast',
    displayName: 'Breakfast',
    startTime: '08:00',
    endTime: '09:00',
    isCustom: true,
  },
  {
    periodKey: 'MorningFirstPeriod',
    displayName: 'Morning First Period',
    startTime: '09:00',
    endTime: '10:40',
  },
  {
    periodKey: 'MorningSecondPeriod',
    displayName: 'Morning Second Period',
    startTime: '10:50',
    endTime: '12:30',
  },
  {
    periodKey: 'custom-lunch',
    displayName: 'Lunch',
    startTime: '12:45',
    endTime: '13:30',
    isCustom: true,
  },
  {
    periodKey: 'custom-free-time',
    displayName: 'Free Time',
    startTime: '13:30',
    endTime: '15:45',
    isCustom: true,
  },
  {
    periodKey: 'AfternoonPeriod',
    displayName: 'Afternoon Period',
    startTime: '15:45',
    endTime: '17:45',
  },
  {
    periodKey: 'custom-dinner',
    displayName: 'Dinner',
    startTime: '18:00',
    endTime: '19:00',
    isCustom: true,
  },
];

/**
 * Build the timeslot list for a given set of parsed periods, using default times
 * where available. Preserves the canonical order from DEFAULT_TIMESLOTS so that
 * Lunch appears between morning and afternoon regardless of parse order.
 * Any parsed period not in the defaults is appended at the end with empty times.
 */
export function buildTimeslotsFromDefaults(parsedPeriods: { sheetName: string; displayName: string }[]): TimeSlot[] {
  const parsedKeys = new Set(parsedPeriods.map((p) => p.sheetName));
  const result: TimeSlot[] = [];

  for (const ts of DEFAULT_TIMESLOTS) {
    if (ts.isCustom || parsedKeys.has(ts.periodKey)) {
      result.push({ ...ts });
    }
  }

  // Append any periods from the file that aren't covered by the defaults
  for (const period of parsedPeriods) {
    if (!DEFAULT_TIMESLOTS.some((ts) => ts.periodKey === period.sheetName)) {
      result.push({ periodKey: period.sheetName, displayName: period.displayName, startTime: '', endTime: '' });
    }
  }

  return result;
}
