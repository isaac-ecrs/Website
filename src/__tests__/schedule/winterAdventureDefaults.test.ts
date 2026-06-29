import { describe, it, expect } from 'vitest';
import {
  buildTimeslotsFromDefaults,
  DEFAULT_TIMESLOTS,
  KNOWN_LOCATIONS,
} from '~/components/schedule/winterAdventureDefaults';

describe('KNOWN_LOCATIONS', () => {
  it('is a non-empty array of strings', () => {
    expect(KNOWN_LOCATIONS.length).toBeGreaterThan(0);
    expect(KNOWN_LOCATIONS.every((l) => typeof l === 'string')).toBe(true);
  });
});

describe('DEFAULT_TIMESLOTS', () => {
  it('contains required fields on every entry', () => {
    expect(DEFAULT_TIMESLOTS.length).toBeGreaterThan(0);
    for (const ts of DEFAULT_TIMESLOTS) {
      expect(ts).toHaveProperty('periodKey');
      expect(ts).toHaveProperty('displayName');
      expect(ts).toHaveProperty('startTime');
      expect(ts).toHaveProperty('endTime');
    }
  });

  it('includes canonical meal and activity entries', () => {
    const keys = DEFAULT_TIMESLOTS.map((ts) => ts.periodKey);
    expect(keys).toContain('custom-breakfast');
    expect(keys).toContain('custom-lunch');
    expect(keys).toContain('custom-dinner');
    expect(keys).toContain('MorningFirstPeriod');
    expect(keys).toContain('AfternoonPeriod');
  });
});

describe('buildTimeslotsFromDefaults', () => {
  it('always includes custom timeslots (meals, free time) regardless of parsed periods', () => {
    const result = buildTimeslotsFromDefaults([]);
    const customKeys = result.filter((ts) => ts.isCustom).map((ts) => ts.periodKey);
    expect(customKeys).toContain('custom-breakfast');
    expect(customKeys).toContain('custom-lunch');
    expect(customKeys).toContain('custom-dinner');
  });

  it('includes a parsed period that matches a default slot', () => {
    const result = buildTimeslotsFromDefaults([
      { sheetName: 'MorningFirstPeriod', displayName: 'Morning First Period' },
    ]);
    expect(result.map((ts) => ts.periodKey)).toContain('MorningFirstPeriod');
  });

  it('excludes non-custom default slots that were not parsed', () => {
    const result = buildTimeslotsFromDefaults([]);
    const keys = result.map((ts) => ts.periodKey);
    expect(keys).not.toContain('MorningFirstPeriod');
    expect(keys).not.toContain('MorningSecondPeriod');
    expect(keys).not.toContain('AfternoonPeriod');
  });

  it('appends unknown periods at the end with empty times', () => {
    const result = buildTimeslotsFromDefaults([{ sheetName: 'SpecialPeriod', displayName: 'Special Period' }]);
    const last = result[result.length - 1];
    expect(last.periodKey).toBe('SpecialPeriod');
    expect(last.startTime).toBe('');
    expect(last.endTime).toBe('');
  });

  it('preserves canonical ordering from DEFAULT_TIMESLOTS', () => {
    const result = buildTimeslotsFromDefaults([
      { sheetName: 'AfternoonPeriod', displayName: 'Afternoon Period' },
      { sheetName: 'MorningFirstPeriod', displayName: 'Morning First Period' },
    ]);
    const mfpIdx = result.findIndex((ts) => ts.periodKey === 'MorningFirstPeriod');
    const apIdx = result.findIndex((ts) => ts.periodKey === 'AfternoonPeriod');
    expect(mfpIdx).toBeGreaterThanOrEqual(0);
    expect(apIdx).toBeGreaterThan(mfpIdx);
  });

  it('handles all three default period sheets together', () => {
    const result = buildTimeslotsFromDefaults([
      { sheetName: 'MorningFirstPeriod', displayName: 'Morning First Period' },
      { sheetName: 'MorningSecondPeriod', displayName: 'Morning Second Period' },
      { sheetName: 'AfternoonPeriod', displayName: 'Afternoon Period' },
    ]);
    const keys = result.map((ts) => ts.periodKey);
    expect(keys).toContain('MorningFirstPeriod');
    expect(keys).toContain('MorningSecondPeriod');
    expect(keys).toContain('AfternoonPeriod');
  });

  it('unknown periods are appended after all defaults', () => {
    const result = buildTimeslotsFromDefaults([
      { sheetName: 'MorningFirstPeriod', displayName: 'Morning First Period' },
      { sheetName: 'EveningSpecial', displayName: 'Evening Special' },
    ]);
    const defaultKeySet = new Set(DEFAULT_TIMESLOTS.map((ts) => ts.periodKey));
    const lastIdx = result.length - 1;
    // The final entry should be the unknown period
    expect(result[lastIdx].periodKey).toBe('EveningSpecial');
    // All default entries should appear before it
    result.slice(0, lastIdx).forEach((ts) => {
      if (!ts.isCustom) expect(defaultKeySet.has(ts.periodKey)).toBe(true);
    });
  });
});
