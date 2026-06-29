import { describe, it, expect } from 'vitest';
import { parseExcel, ExcelParseError } from '~/components/schedule/excelParser';
import { buildWorkbook, makeClassSelectionSheet, makePeriodSheet } from './helpers';

// col index constants (0-based) matching PERIOD_HEADERS order:
// 0: ClassSelection_Id, 1: AttendeeName_First, 2: AttendeeName_Last, 3: AttendeeName,
// 4: 2024WinterAdventureClassRegist_Id, 5: _4dayClasses, 6: ChoiceNumber,
// 7: _2dayClassesFirst2Days, 8: _2dayClassesSecond2Days

function row(
  selId: string,
  first: string,
  last: string,
  c4day = '',
  choice = '1',
  c2day1 = '',
  c2day2 = ''
): (string | number | null)[] {
  return [selId, first, last, `${first} ${last}`, '', c4day, choice, c2day1, c2day2];
}

function attendeeRow(selId: string, first: string, last: string, email = '', age = ''): string[] {
  return [selId, first, last, email, age];
}

describe('parseExcel', () => {
  it('throws ExcelParseError when ClassSelection sheet is missing', () => {
    const buffer = buildWorkbook({ WrongSheet: [['a']] });
    expect(() => parseExcel(buffer)).toThrow(ExcelParseError);
  });

  it('throws ExcelParseError when no workshops found in any period sheet', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([]),
    });
    expect(() => parseExcel(buffer)).toThrow(ExcelParseError);
  });

  it('parses a single workshop from a minimal valid file', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson', 'alice@example.com', '25')]),
      MorningFirstPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)')]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].name).toBe('Woodworking');
    expect(workshops[0].leader).toBe('John Smith');
  });

  it('parses multiple different workshops', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([
        attendeeRow('SEL001', 'Alice', 'Johnson'),
        attendeeRow('SEL002', 'Bob', 'Williams'),
      ]),
      MorningFirstPeriod: makePeriodSheet([
        row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)'),
        row('SEL002', 'Bob', 'Williams', 'Pottery (Jane Doe)'),
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(2);
    const names = workshops.map((w) => w.name);
    expect(names).toContain('Woodworking');
    expect(names).toContain('Pottery');
  });

  it('aggregates multiple attendees into the same workshop', () => {
    const classData = [1, 2, 3].map((n) => attendeeRow(`SEL00${n}`, `Person${n}`, 'LastName'));
    const periodData = [1, 2, 3].map((n) => row(`SEL00${n}`, `Person${n}`, 'LastName', 'Woodworking (John Smith)'));
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet(classData),
      MorningFirstPeriod: makePeriodSheet(periodData),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].selections).toHaveLength(3);
  });

  it('creates distinct workshops for different durations', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([
        attendeeRow('SEL001', 'Alice', 'Johnson'),
        attendeeRow('SEL002', 'Bob', 'Williams'),
      ]),
      MorningFirstPeriod: makePeriodSheet([
        // SEL001 in 4-day column, SEL002 in 2-day first-half column
        ['SEL001', 'Alice', 'Johnson', 'Alice Johnson', '', 'Woodworking (John Smith)', '1', '', ''],
        ['SEL002', 'Bob', 'Williams', 'Bob Williams', '', '', '1', 'Woodworking (John Smith)', ''],
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(2);
    const durations = workshops.map((w) => w.duration.endDay - w.duration.startDay + 1).sort();
    expect(durations).toEqual([2, 4]);
  });

  it('creates distinct workshops for different leaders', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([
        attendeeRow('SEL001', 'Alice', 'Johnson'),
        attendeeRow('SEL002', 'Bob', 'Williams'),
      ]),
      MorningFirstPeriod: makePeriodSheet([
        row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)'),
        row('SEL002', 'Bob', 'Williams', 'Woodworking (Jane Doe)'),
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(2);
    const leaders = workshops.map((w) => w.leader);
    expect(leaders).toContain('John Smith');
    expect(leaders).toContain('Jane Doe');
  });

  it('creates distinct workshops for the same name in different periods', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)')]),
      AfternoonPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)')]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(2);
    const periods = workshops.map((w) => w.period.sheetName);
    expect(periods).toContain('MorningFirstPeriod');
    expect(periods).toContain('AfternoonPeriod');
  });

  it('skips missing period sheets and parses what exists', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)')]),
      // MorningSecondPeriod and AfternoonPeriod omitted intentionally
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].name).toBe('Woodworking');
  });

  it('skips rows with empty workshop cells', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([
        attendeeRow('SEL001', 'Alice', 'Johnson'),
        attendeeRow('SEL002', 'Bob', 'Williams'),
      ]),
      MorningFirstPeriod: makePeriodSheet([
        row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)'),
        row('SEL002', 'Bob', 'Williams', ''), // empty workshop
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].selections).toHaveLength(1);
    expect(workshops[0].selections[0].firstName).toBe('Alice');
  });

  it('generates fallback ID when ClassSelection_Id is empty', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([['', 'Bob', 'Smith', 'bob@example.com', '25']]),
      MorningFirstPeriod: makePeriodSheet([row('BobSmith', 'Bob', 'Smith', 'Woodworking (John Smith)')]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].selections[0].classSelectionId).toBe('BobSmith');
  });

  it('stores choice numbers correctly', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([
        attendeeRow('SEL001', 'Alice', 'Johnson'),
        attendeeRow('SEL002', 'Bob', 'Williams'),
      ]),
      MorningFirstPeriod: makePeriodSheet([
        row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)', '1'),
        row('SEL002', 'Bob', 'Williams', 'Woodworking (John Smith)', '3'),
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    const choices = workshops[0].selections.map((s) => s.choiceNumber).sort();
    expect(choices).toEqual([1, 3]);
  });

  it('defaults invalid choice number to 1', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([
        ['SEL001', 'Alice', 'Johnson', 'Alice Johnson', '', 'Pottery (Jane Doe)', 'ABC', '', ''],
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops[0].selections[0].choiceNumber).toBe(1);
  });

  it('skips rows with both first and last name missing', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([
        ['SEL001', null, null, '', ''], // no name, should be skipped
        attendeeRow('SEL002', 'Alice', 'Smith'),
      ]),
      MorningFirstPeriod: makePeriodSheet([row('SEL002', 'Alice', 'Smith', 'Pottery (Jane Doe)')]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].selections[0].firstName).toBe('Alice');
  });

  it('skips whitespace-only workshop cells and throws when nothing found', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', '   ')]),
    });
    expect(() => parseExcel(buffer)).toThrow(ExcelParseError);
  });

  it('throws ExcelParseError when the file bytes are not a valid xlsx', () => {
    const garbage = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
    expect(() => parseExcel(garbage)).toThrow(ExcelParseError);
  });

  it('throws ExcelParseError when ClassSelection has no data rows', () => {
    // Sheet exists but contains only the header row — attendees.size === 0
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([]),
      MorningFirstPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', 'Woodworking (John Smith)')]),
    });
    expect(() => parseExcel(buffer)).toThrow(ExcelParseError);
  });

  it('creates a synthetic attendee when period row selectionId is absent from ClassSelection', () => {
    // ClassSelection has SEL001; period sheet has SEL999 — triggers the fallback attendee branch
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([row('SEL999', 'Bob', 'Williams', 'Pottery (Jane Doe)')]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].name).toBe('Pottery');
    expect(workshops[0].selections[0].firstName).toBe('Bob');
  });

  it('handles very long workshop names', () => {
    const longName = 'A'.repeat(500);
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([row('SEL001', 'Alice', 'Johnson', `${longName} (John Smith)`)]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].name).toBe(longName);
    expect(workshops[0].leader).toBe('John Smith');
  });

  it('handles special characters in workshop names and leader names', () => {
    const buffer = buildWorkbook({
      ClassSelection: makeClassSelectionSheet([attendeeRow('SEL001', 'Alice', 'Johnson')]),
      MorningFirstPeriod: makePeriodSheet([
        row('SEL001', 'Alice', 'Johnson', "Pottery & Ceramics: Beginner's Class! (John O'Brien-Smith)"),
      ]),
    });
    const workshops = parseExcel(buffer);
    expect(workshops).toHaveLength(1);
    expect(workshops[0].name).toBe("Pottery & Ceramics: Beginner's Class!");
    expect(workshops[0].leader).toBe("John O'Brien-Smith");
  });
});
