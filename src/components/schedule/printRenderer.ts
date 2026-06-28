import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { formatTimeRange } from './timeUtils';
import type { TimeSlot } from './models';
import type { MasterScheduleData, RosterEntry, IndividualSchedule } from './scheduleBuilder';
import { compositeMap } from './mapCompositor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfMake as any).vfs = ((pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs) as Record<string, string>;

const HEADER_FILL = '#e0e0e0';
const META_COLOR = '#555555';
const MUTED_COLOR = '#aaaaaa';

// ---------------------------------------------------------------------------
// Master Schedule
// ---------------------------------------------------------------------------

const ACTIVITY_FILL = '#f0f0f0';

export function downloadMasterSchedule(data: MasterScheduleData, eventName: string): void {
  const { locations, timeslots, workshops } = data;
  if (locations.length === 0) return;

  const year = new Date().getFullYear();
  const landscape = locations.length > 4;
  const colCount = 2 + locations.length; // Time | Days | ...locations

  const widths = ['auto', 'auto', ...locations.map(() => '*' as string)];

  const headerRow: object[] = [
    { text: 'Time', bold: true, fillColor: HEADER_FILL, alignment: 'center', fontSize: 11 },
    { text: 'Days', bold: true, fillColor: HEADER_FILL, alignment: 'center', fontSize: 11 },
    ...locations.map((loc) => ({ text: loc, bold: true, fillColor: HEADER_FILL, alignment: 'center', fontSize: 11 })),
  ];

  const bodyRows: object[][] = [];

  for (const ts of timeslots) {
    const timeStr = formatTimeRange(ts.startTime, ts.endTime);

    if (ts.isCustom) {
      const label = timeStr ? `${ts.displayName}  ${timeStr}` : ts.displayName;
      bodyRows.push([
        { text: label, colSpan: colCount, alignment: 'center', fillColor: ACTIVITY_FILL, bold: true, fontSize: 11 },
        ...Array<object>(colCount - 1).fill({}),
      ]);
    } else {
      const row12: object[] = [];
      const row34: object[] = [];

      // Time cell spans both day sub-rows — show time range if available, fall back to name
      row12.push({
        text: timeStr || ts.displayName,
        bold: true,
        fontSize: 11,
        alignment: 'center',
        verticalAlignment: 'center',
        rowSpan: 2,
      });
      row34.push({});

      row12.push({
        text: 'Days\n1-2',
        fontSize: 9,
        alignment: 'center',
        verticalAlignment: 'center',
        color: META_COLOR,
      });
      row34.push({
        text: 'Days\n3-4',
        fontSize: 9,
        alignment: 'center',
        verticalAlignment: 'center',
        color: META_COLOR,
      });

      const makeCell = (w: (typeof workshops)[0] | undefined): object =>
        w
          ? {
              stack: [
                { text: w.name, bold: true, fontSize: 11 },
                ...(w.leader ? [{ text: w.leader, fontSize: 9, color: META_COLOR, italics: true }] : []),
              ],
              verticalAlignment: 'center',
            }
          : { text: '', verticalAlignment: 'center' };

      for (const loc of locations) {
        const fourDay = workshops.find(
          (w) =>
            w.period.sheetName === ts.periodKey &&
            w.location === loc &&
            w.duration.startDay === 1 &&
            w.duration.endDay === 4
        );
        const half12 = workshops.find(
          (w) =>
            w.period.sheetName === ts.periodKey &&
            w.location === loc &&
            w.duration.startDay === 1 &&
            w.duration.endDay === 2
        );
        const half34 = workshops.find(
          (w) =>
            w.period.sheetName === ts.periodKey &&
            w.location === loc &&
            w.duration.startDay === 3 &&
            w.duration.endDay === 4
        );

        if (fourDay) {
          row12.push({ ...makeCell(fourDay), rowSpan: 2 } as object);
          row34.push({});
        } else {
          row12.push(makeCell(half12));
          row34.push(makeCell(half34));
        }
      }

      bodyRows.push(row12);
      bodyRows.push(row34);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableLayout: any = {
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 7,
    paddingBottom: () => 7,
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
      i === 0 || i === node.table.body.length ? 1 : 0.5,
    hLineColor: () => '#bbbbbb',
    vLineWidth: () => 0.5,
    vLineColor: () => '#cccccc',
  };

  pdfMake
    .createPdf({
      pageOrientation: landscape ? 'landscape' : 'portrait',
      pageSize: 'LETTER',
      pageMargins: [24, 32, 24, 24],
      content: [
        {
          columns: [
            { text: 'Schedule', fontSize: 22, bold: true },
            {
              text: `${eventName} ${year}`,
              fontSize: 13,
              bold: true,
              alignment: 'right',
              color: META_COLOR,
              margin: [0, 6, 0, 0],
            },
          ],
          marginBottom: 10,
        },
        {
          table: { headerRows: 1, widths, body: [headerRow, ...bodyRows] },
          layout: tableLayout,
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .download(`${eventName.replace(/\s+/g, '_')}_Schedule_${year}.pdf`);
}

// ---------------------------------------------------------------------------
// Workshop Rosters
// ---------------------------------------------------------------------------

function rosterNameFontSize(fullName: string, counter: number): number {
  const len = `${counter}. ${fullName} [ ]`.length;
  if (len > 45) return 10;
  if (len > 35) return 11;
  if (len > 28) return 12;
  return 14;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rosterTableLayout: any = {
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 9,
  paddingBottom: () => 9,
  hLineWidth: () => 0,
  vLineWidth: () => 0,
};

function rosterTable(items: Array<{ a: RosterEntry['attendees'][0]; counter: number }>): object {
  return {
    table: {
      widths: ['auto', '*', 'auto'],
      body: items.map(({ a, counter }) => {
        const fs = rosterNameFontSize(a.fullName, counter);
        return [
          { text: `${counter}.`, fontSize: fs, color: META_COLOR },
          { text: a.fullName, fontSize: fs },
          { text: '[      ]', fontSize: 20, bold: true, verticalAlignment: 'center' },
        ];
      }),
    },
    layout: rosterTableLayout,
  };
}

export function downloadRosters(rosters: RosterEntry[], eventName: string): void {
  const content: object[] = [];

  rosters.forEach((r, idx) => {
    let attendeeList: object;
    if (r.attendees.length === 0) {
      attendeeList = { text: 'No attendees', italics: true, color: MUTED_COLOR, margin: [0, 8, 0, 0] };
    } else {
      const indexed = r.attendees.map((a, i) => ({ a, counter: i + 1 }));
      const left = indexed.filter((_, i) => i % 2 === 0);
      const right = indexed.filter((_, i) => i % 2 === 1);
      attendeeList = {
        columns: right.length > 0 ? [rosterTable(left), rosterTable(right)] : [rosterTable(left)],
        margin: [0, 8, 0, 0],
      };
    }

    content.push({
      stack: [
        { text: r.workshopName, fontSize: 24, bold: true },
        ...(r.leader ? [{ text: r.leader, fontSize: 16, color: META_COLOR, marginTop: 2 }] : []),
        {
          text: `${r.period}  •  ${r.location}  •  ${r.attendees.length} attendee${r.attendees.length !== 1 ? 's' : ''}`,
          fontSize: 12,
          color: META_COLOR,
          margin: [0, 6, 0, 0],
        },
        attendeeList,
      ],
      ...(idx > 0 ? { pageBreak: 'before' } : {}),
    });
  });

  pdfMake
    .createPdf({
      pageSize: 'LETTER',
      pageMargins: [54, 54, 54, 54],
      footer: (currentPage: number, pageCount: number) => ({
        text: `${eventName}  |  Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        fontSize: 9,
        color: META_COLOR,
        margin: [0, 12, 0, 0],
      }),
      content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .download(`${eventName}_Rosters.pdf`);
}

// ---------------------------------------------------------------------------
// Individual Schedules
// ---------------------------------------------------------------------------

export async function downloadIndividualSchedules(
  schedules: IndividualSchedule[],
  timeslots: TimeSlot[],
  eventName: string
): Promise<void> {
  const content: object[] = [];
  const year = new Date().getFullYear();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indvLayout: any = {
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 10,
    paddingBottom: () => 10,
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
      i === 0 || i === node.table.body.length ? 1 : 0.5,
    hLineColor: () => '#bbbbbb',
    vLineWidth: () => 0.5,
    vLineColor: () => '#cccccc',
  };

  for (const [idx, s] of schedules.entries()) {
    // Group entries by period — a period may have two half-block entries (days 1-2 and 3-4)
    const entryMap = new Map<string, (typeof s.entries)[number][]>();
    for (const entry of s.entries) {
      const existing = entryMap.get(entry.periodKey) ?? [];
      existing.push(entry);
      entryMap.set(entry.periodKey, existing);
    }

    const tableBody: object[][] = [
      [
        { text: 'Time', bold: true, fillColor: HEADER_FILL, fontSize: 13 },
        { text: 'Activity', bold: true, fillColor: HEADER_FILL, fontSize: 13 },
      ],
    ];

    for (const ts of timeslots) {
      const entries = entryMap.get(ts.periodKey) ?? [];
      const timeStr = formatTimeRange(ts.startTime, ts.endTime);
      const timeCell = { text: timeStr || ts.displayName, fontSize: 12, color: META_COLOR };

      if (entries.length > 0) {
        // Sort by startDay so days 1-2 always appears above days 3-4
        const sorted = [...entries].sort((a, b) => a.startDay - b.startDay);
        const isSplit = sorted.length > 1;

        const activityStack = sorted.flatMap((entry, i) => {
          const nameText = isSplit
            ? `Days ${entry.startDay}–${entry.endDay}: ${entry.workshopName}${entry.location && entry.location !== '(No Location)' ? ` — ${entry.location}` : ''}`
            : entry.location && entry.location !== '(No Location)'
              ? `${entry.workshopName} — ${entry.location}`
              : entry.workshopName;
          return [
            { text: nameText, bold: true, fontSize: 13, ...(isSplit && i > 0 ? { marginTop: 6 } : {}) },
            ...(entry.leader ? [{ text: entry.leader, fontSize: 11, color: META_COLOR, italics: true }] : []),
          ];
        });

        tableBody.push([timeCell, { stack: activityStack }]);
      } else if (ts.isCustom) {
        const isMeal = /breakfast|lunch|dinner/i.test(ts.periodKey);
        const activity = isMeal ? `${ts.displayName} - Dining Hall` : ts.displayName;
        tableBody.push([timeCell, { text: activity, fontSize: 13, color: META_COLOR }]);
      } else {
        tableBody.push([timeCell, { text: 'Free', fontSize: 13, italics: true, color: MUTED_COLOR }]);
      }
    }

    // Collect unique locations for this attendee (exclude placeholder)
    const locations = Array.from(new Set(s.entries.map((e) => e.location).filter((l) => l && l !== '(No Location)')));

    const mapDataUrl = await compositeMap(locations);

    content.push({
      stack: [
        { text: `${eventName} ${year}`, fontSize: 13, color: META_COLOR, marginBottom: 2 },
        { text: `Schedule for ${s.fullName}`, fontSize: 22, bold: true, marginBottom: 14 },
        {
          table: { headerRows: 1, widths: ['auto', '*'], body: tableBody },
          layout: indvLayout,
        },
        {
          image: mapDataUrl,
          width: 504,
          alignment: 'center',
          margin: [0, 12, 0, 0],
        },
      ],
      ...(idx > 0 ? { pageBreak: 'before' } : {}),
    });
  }

  pdfMake
    .createPdf({
      pageSize: 'LETTER',
      pageMargins: [54, 48, 54, 36],
      footer: (currentPage: number, pageCount: number) => ({
        text: `${eventName}  |  Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        fontSize: 9,
        color: META_COLOR,
        margin: [0, 12, 0, 0],
      }),
      content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .download(`${eventName}_IndividualSchedules.pdf`);
}
