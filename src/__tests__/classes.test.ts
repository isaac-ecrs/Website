import { describe, expect, it } from 'vitest';
import { groupClassesByPeriod } from '../utils/classes';

describe('groupClassesByPeriod', () => {
  it('returns an empty map for empty input', () => {
    expect(groupClassesByPeriod([])).toEqual(new Map());
  });

  it('groups classes by period in first-seen insertion order', () => {
    const classes = [
      { name: 'Folk Dance', period: 'Morning First Period' },
      { name: 'Sketch 101', period: 'Morning Second Period' },
      { name: 'Games', period: 'Morning Second Period' },
    ];
    const groups = groupClassesByPeriod(classes);
    expect([...groups.keys()]).toEqual(['Morning First Period', 'Morning Second Period']);
    expect(groups.get('Morning First Period')).toHaveLength(1);
    expect(groups.get('Morning Second Period')).toHaveLength(2);
  });

  it('preserves class insertion order within each group', () => {
    const classes = [
      { name: 'A', period: 'Morning' },
      { name: 'B', period: 'Afternoon' },
      { name: 'C', period: 'Morning' },
    ];
    const groups = groupClassesByPeriod(classes);
    expect(groups.get('Morning')!.map((c) => c.name)).toEqual(['A', 'C']);
    expect(groups.get('Afternoon')!.map((c) => c.name)).toEqual(['B']);
  });

  it('groups classes without a period under the empty string key', () => {
    const classes = [{ name: 'A' }, { name: 'B', period: 'Morning' }];
    const groups = groupClassesByPeriod(classes);
    expect([...groups.keys()]).toEqual(['', 'Morning']);
    expect(groups.get('')!.map((c) => c.name)).toEqual(['A']);
  });

  it('handles all classes without periods', () => {
    const classes = [{ name: 'A' }, { name: 'B' }];
    const groups = groupClassesByPeriod(classes);
    expect([...groups.keys()]).toEqual(['']);
    expect(groups.get('')).toHaveLength(2);
  });

  it('a new period seen later appears after earlier periods', () => {
    const classes = [
      { name: 'X', period: 'Afternoon' },
      { name: 'Y', period: 'Morning' },
      { name: 'Z', period: 'Afternoon' },
    ];
    const groups = groupClassesByPeriod(classes);
    expect([...groups.keys()]).toEqual(['Afternoon', 'Morning']);
  });

  it('passes through all class fields unchanged', () => {
    const cls = {
      name: 'Yoga',
      instructor: 'Jane',
      ageRange: '12+',
      period: 'Morning',
      days: 'Days 1–2',
      limitedCapacity: true,
      advanceRegistration: false,
      description: 'Gentle movement class.',
    };
    const groups = groupClassesByPeriod([cls]);
    expect(groups.get('Morning')![0]).toEqual(cls);
  });
});
