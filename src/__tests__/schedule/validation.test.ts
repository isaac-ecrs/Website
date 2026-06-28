import { describe, it, expect } from 'vitest';
import { validateTimeslots, validateLocations } from '~/components/schedule/validation';
import type { TimeSlot, Workshop } from '~/components/schedule/models';

function makeSlot(
  periodKey: string,
  displayName: string,
  startTime: string,
  endTime: string,
  isCustom = false
): TimeSlot {
  return { periodKey, displayName, startTime, endTime, isCustom };
}

describe('validateTimeslots', () => {
  it('returns valid for empty list', () => {
    const result = validateTimeslots([]);
    expect(result.isValid).toBe(true);
    expect(result.hasOverlappingTimeslots).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(false);
  });

  it('returns valid for single configured period slot', () => {
    const result = validateTimeslots([makeSlot('p1', 'Morning Period', '09:00', '10:30')]);
    expect(result.isValid).toBe(true);
    expect(result.hasOverlappingTimeslots).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(false);
  });

  it('returns valid for non-overlapping slots', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning Period', '09:00', '10:30'),
      makeSlot('p2', 'Lunch', '12:00', '13:00', true),
      makeSlot('p3', 'Afternoon Period', '13:30', '15:00'),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.hasOverlappingTimeslots).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(false);
  });

  it('returns valid for adjacent slots (end equals next start)', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning Period', '09:00', '10:30'),
      makeSlot('p2', 'Late Morning', '10:30', '12:00'),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.hasOverlappingTimeslots).toBe(false);
  });

  it('detects overlapping periods', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning Period', '09:00', '10:30'),
      makeSlot('p2', 'Late Morning', '10:00', '11:30'),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.hasOverlappingTimeslots).toBe(true);
    expect(result.hasUnconfiguredTimeslots).toBe(false);
  });

  it('detects completely overlapping (one contains another)', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'All Day', '08:00', '17:00'),
      makeSlot('p2', 'Lunch', '12:00', '13:00', true),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.hasOverlappingTimeslots).toBe(true);
  });

  it('detects minimal overlap (1 minute)', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning Period', '09:00', '10:30'),
      makeSlot('p2', 'Late Morning', '10:29', '11:30'),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.hasOverlappingTimeslots).toBe(true);
  });

  it('detects identical timeslots as overlapping', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning Period', '09:00', '10:30'),
      makeSlot('p2', 'Another Morning', '09:00', '10:30'),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.hasOverlappingTimeslots).toBe(true);
  });

  it('detects unconfigured period slot (no start time)', () => {
    const result = validateTimeslots([makeSlot('p1', 'Morning Period', '', '10:30')]);
    expect(result.isValid).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(true);
    expect(result.hasOverlappingTimeslots).toBe(false);
  });

  it('detects unconfigured period slot (no end time)', () => {
    const result = validateTimeslots([makeSlot('p1', 'Morning Period', '09:00', '')]);
    expect(result.isValid).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(true);
  });

  it('detects unconfigured period slot (both times missing)', () => {
    const result = validateTimeslots([makeSlot('p1', 'Morning Period', '', '')]);
    expect(result.isValid).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(true);
  });

  it('custom slots with no times are not flagged as unconfigured', () => {
    const result = validateTimeslots([makeSlot('c1', 'Free Time', '', '', true)]);
    expect(result.isValid).toBe(true);
    expect(result.hasUnconfiguredTimeslots).toBe(false);
  });

  it('detects both overlap and unconfigured', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning Period', '09:00', '10:30'),
      makeSlot('p2', 'Late Morning', '10:00', '11:30'),
      makeSlot('p3', 'Afternoon Period', '', '15:00'),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.hasOverlappingTimeslots).toBe(true);
    expect(result.hasUnconfiguredTimeslots).toBe(true);
  });

  it('three consecutive adjacent slots are valid', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Period 1', '09:00', '10:00'),
      makeSlot('p2', 'Period 2', '10:00', '11:00'),
      makeSlot('p3', 'Period 3', '11:00', '12:00'),
    ]);
    expect(result.isValid).toBe(true);
  });

  it('typical Winter Adventure schedule is valid', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning First Period', '09:15', '10:45'),
      makeSlot('p2', 'Morning Second Period', '11:00', '12:30'),
      makeSlot('lunch', 'Lunch', '12:30', '13:30', true),
      makeSlot('p3', 'Afternoon First Period', '13:30', '15:00'),
      makeSlot('p4', 'Afternoon Second Period', '15:15', '16:45'),
    ]);
    expect(result.isValid).toBe(true);
  });

  it('one unconfigured period in multi-period list is detected', () => {
    const result = validateTimeslots([
      makeSlot('p1', 'Morning First Period', '09:15', '10:45'),
      makeSlot('p2', 'Morning Second Period', '', ''),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.hasUnconfiguredTimeslots).toBe(true);
    expect(result.hasOverlappingTimeslots).toBe(false);
  });
});

function makeWorkshop(
  name: string,
  periodKey: string,
  periodDisplay: string,
  location: string,
  startDay = 1,
  endDay = 4
): Workshop {
  return {
    name,
    leader: '',
    period: { sheetName: periodKey, displayName: periodDisplay },
    duration: { startDay, endDay },
    location,
    selections: [],
  };
}

describe('validateLocations', () => {
  it('returns empty for workshops with no locations', () => {
    expect(validateLocations([makeWorkshop('Pottery', 'p1', 'Morning', '')])).toHaveLength(0);
  });

  it('returns empty when each location is unique within a period', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library'),
      makeWorkshop('Dance', 'p1', 'Morning', 'Rec Hall'),
    ];
    expect(validateLocations(ws)).toHaveLength(0);
  });

  it('detects two 4-day workshops sharing a location in the same period', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library', 1, 4),
      makeWorkshop('Weaving', 'p1', 'Morning', 'Library', 1, 4),
    ];
    const conflicts = validateLocations(ws);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].location).toBe('Library');
    expect(conflicts[0].workshopNames).toContain('Pottery');
    expect(conflicts[0].workshopNames).toContain('Weaving');
  });

  it('allows Days 1-2 and Days 3-4 workshops to share a location in the same period', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library', 1, 2),
      makeWorkshop('Weaving', 'p1', 'Morning', 'Library', 3, 4),
    ];
    expect(validateLocations(ws)).toHaveLength(0);
  });

  it('flags a 4-day workshop conflicting with a Days 1-2 workshop in the same room', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library', 1, 4),
      makeWorkshop('Weaving', 'p1', 'Morning', 'Library', 1, 2),
    ];
    const conflicts = validateLocations(ws);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].workshopNames).toContain('Pottery');
    expect(conflicts[0].workshopNames).toContain('Weaving');
  });

  it('allows the same location in different periods', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library'),
      makeWorkshop('Dance', 'p2', 'Afternoon', 'Library'),
    ];
    expect(validateLocations(ws)).toHaveLength(0);
  });

  it('reports separate conflicts for separate periods', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library', 1, 4),
      makeWorkshop('Weaving', 'p1', 'Morning', 'Library', 1, 4),
      makeWorkshop('Dance', 'p2', 'Afternoon', 'Rec Hall', 1, 4),
      makeWorkshop('Yoga', 'p2', 'Afternoon', 'Rec Hall', 1, 4),
    ];
    expect(validateLocations(ws)).toHaveLength(2);
  });

  it('ignores workshops with empty location', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library', 1, 4),
      makeWorkshop('Weaving', 'p1', 'Morning', 'Library', 1, 4),
      makeWorkshop('Dance', 'p1', 'Morning', ''),
    ];
    const conflicts = validateLocations(ws);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].workshopNames).not.toContain('Dance');
  });

  it('Days 1-2 and Days 3-4 in same room plus a 4-day in same room: only 4-day conflicts', () => {
    const ws = [
      makeWorkshop('Pottery', 'p1', 'Morning', 'Library', 1, 2),
      makeWorkshop('Weaving', 'p1', 'Morning', 'Library', 3, 4),
      makeWorkshop('Improv', 'p1', 'Morning', 'Library', 1, 4),
    ];
    const conflicts = validateLocations(ws);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].workshopNames).toContain('Pottery');
    expect(conflicts[0].workshopNames).toContain('Improv');
    expect(conflicts[0].workshopNames).toContain('Weaving');
  });
});
