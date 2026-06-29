import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreatePdf, mockDownload, mockCompositeMap } = vi.hoisted(() => {
  const mockDownload = vi.fn();
  const mockCreatePdf = vi.fn().mockReturnValue({ download: mockDownload });
  const mockCompositeMap = vi.fn().mockResolvedValue('data:image/png;base64,MOCK');
  return { mockCreatePdf, mockDownload, mockCompositeMap };
});

vi.mock('pdfmake/build/pdfmake', () => ({
  default: { vfs: {}, createPdf: mockCreatePdf },
}));

vi.mock('pdfmake/build/vfs_fonts', () => ({
  default: { pdfMake: { vfs: {} } },
}));

vi.mock('~/components/schedule/mapCompositor', () => ({
  compositeMap: mockCompositeMap,
}));

import {
  downloadMasterSchedule,
  downloadRosters,
  downloadIndividualSchedules,
} from '~/components/schedule/printRenderer';
import type { MasterScheduleData, RosterEntry, IndividualSchedule } from '~/components/schedule/scheduleBuilder';
import type { TimeSlot } from '~/components/schedule/models';

const timeslots: TimeSlot[] = [
  { periodKey: 'MorningFirstPeriod', displayName: 'Morning First Period', startTime: '09:00', endTime: '10:40' },
  { periodKey: 'custom-lunch', displayName: 'Lunch', startTime: '12:45', endTime: '13:30', isCustom: true },
  { periodKey: 'custom-free-time', displayName: 'Free Time', startTime: '13:30', endTime: '15:45', isCustom: true },
  { periodKey: 'AfternoonPeriod', displayName: 'Afternoon Period', startTime: '15:45', endTime: '17:45' },
  { periodKey: 'custom-dinner', displayName: 'Dinner', startTime: '18:00', endTime: '19:00', isCustom: true },
];

const masterData: MasterScheduleData = {
  locations: ['Chapel A', 'Library'],
  timeslots,
  workshops: [
    {
      name: 'Woodworking',
      leader: 'John Smith',
      period: { sheetName: 'MorningFirstPeriod', displayName: 'Morning First Period' },
      duration: { startDay: 1, endDay: 4 },
      location: 'Chapel A',
      selections: [],
    },
    {
      name: 'Pottery',
      leader: 'Jane Doe',
      period: { sheetName: 'MorningFirstPeriod', displayName: 'Morning First Period' },
      duration: { startDay: 1, endDay: 2 },
      location: 'Library',
      selections: [],
    },
    {
      name: 'Painting',
      leader: '',
      period: { sheetName: 'AfternoonPeriod', displayName: 'Afternoon Period' },
      duration: { startDay: 3, endDay: 4 },
      location: 'Library',
      selections: [],
    },
  ],
};

describe('downloadMasterSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePdf.mockReturnValue({ download: mockDownload });
  });

  it('calls createPdf and download with typical data', () => {
    downloadMasterSchedule(masterData, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
    expect(mockDownload).toHaveBeenCalledOnce();
  });

  it('returns early without calling createPdf when locations is empty', () => {
    downloadMasterSchedule({ locations: [], timeslots: [], workshops: [] }, 'Winter Adventure');
    expect(mockCreatePdf).not.toHaveBeenCalled();
  });

  it('uses landscape orientation for more than 4 locations', () => {
    const landscapeData: MasterScheduleData = {
      ...masterData,
      locations: ['Loc A', 'Loc B', 'Loc C', 'Loc D', 'Loc E'],
    };
    downloadMasterSchedule(landscapeData, 'Winter Adventure');
    const docDef = mockCreatePdf.mock.calls[0][0];
    expect(docDef.pageOrientation).toBe('landscape');
  });

  it('uses portrait orientation for 4 or fewer locations', () => {
    downloadMasterSchedule(masterData, 'Winter Adventure');
    const docDef = mockCreatePdf.mock.calls[0][0];
    expect(docDef.pageOrientation).toBe('portrait');
  });

  it('handles custom (activity) timeslots in the body', () => {
    const customOnly: MasterScheduleData = {
      locations: ['Chapel A'],
      timeslots: [
        { periodKey: 'custom-lunch', displayName: 'Lunch', startTime: '12:45', endTime: '13:30', isCustom: true },
      ],
      workshops: [],
    };
    downloadMasterSchedule(customOnly, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('handles regular timeslots with half-block (days 1-2 and 3-4) workshops', () => {
    // masterData already has a days-1-2 workshop → exercises the half12/half34 paths
    downloadMasterSchedule(masterData, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('handles a timeslot with no workshops at all', () => {
    const noWorkshopData: MasterScheduleData = {
      locations: ['Chapel A'],
      timeslots: [
        { periodKey: 'MorningFirstPeriod', displayName: 'Morning First Period', startTime: '09:00', endTime: '10:40' },
      ],
      workshops: [],
    };
    downloadMasterSchedule(noWorkshopData, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('includes event name in the filename', () => {
    downloadMasterSchedule(masterData, 'My Event');
    expect(mockDownload).toHaveBeenCalledWith(expect.stringContaining('My_Event'));
  });
});

describe('downloadRosters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePdf.mockReturnValue({ download: mockDownload });
  });

  const rosters: RosterEntry[] = [
    {
      workshopName: 'Woodworking',
      leader: 'John Smith',
      location: 'Chapel A',
      period: 'Morning First Period',
      attendees: [
        { fullName: 'Ali', age: '25' },
        { fullName: 'Christopher Alexander Williamson-Thompson Jr', age: '30' },
        { fullName: 'Alexander Williamson', age: '28' },
        { fullName: 'Christopher Alexander', age: '22' },
      ],
    },
  ];

  it('calls createPdf and download', () => {
    downloadRosters(rosters, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
    expect(mockDownload).toHaveBeenCalledOnce();
  });

  it('handles a roster with no attendees', () => {
    const emptyRoster: RosterEntry[] = [
      { workshopName: 'Empty Workshop', leader: '', location: 'Library', period: 'Afternoon Period', attendees: [] },
    ];
    downloadRosters(emptyRoster, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('handles a roster with a single attendee (no right column)', () => {
    const singleAttendee: RosterEntry[] = [
      {
        workshopName: 'Solo Workshop',
        leader: 'Jane',
        location: 'Martin Room',
        period: 'Morning First Period',
        attendees: [{ fullName: 'Alice Johnson', age: '25' }],
      },
    ];
    downloadRosters(singleAttendee, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('handles multiple rosters (adds pageBreak after first)', () => {
    const multiRosters: RosterEntry[] = [
      ...rosters,
      {
        workshopName: 'Pottery',
        leader: 'Jane Doe',
        location: 'Library',
        period: 'Afternoon Period',
        attendees: [{ fullName: 'Carol Davis', age: '28' }],
      },
    ];
    downloadRosters(multiRosters, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('handles a roster entry without a leader', () => {
    const noLeader: RosterEntry[] = [
      {
        workshopName: 'Open Workshop',
        leader: '',
        location: 'Elm Room',
        period: 'Morning First Period',
        attendees: [{ fullName: 'Alice Johnson', age: '' }],
      },
    ];
    downloadRosters(noLeader, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });
});

describe('downloadIndividualSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePdf.mockReturnValue({ download: mockDownload });
  });

  it('calls createPdf, download, and compositeMap', async () => {
    const schedules: IndividualSchedule[] = [
      {
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
        age: '25',
        entries: [
          {
            periodKey: 'MorningFirstPeriod',
            periodDisplay: 'Morning First Period',
            workshopName: 'Woodworking',
            leader: 'John Smith',
            location: 'Chapel A',
            startDay: 1,
            endDay: 4,
          },
        ],
      },
    ];
    await downloadIndividualSchedules(schedules, timeslots, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
    expect(mockDownload).toHaveBeenCalledOnce();
    expect(mockCompositeMap).toHaveBeenCalledOnce();
  });

  it('renders Free rows for regular timeslots with no entry', async () => {
    const schedules: IndividualSchedule[] = [{ fullName: 'Alice Johnson', email: '', age: '', entries: [] }];
    await downloadIndividualSchedules(schedules, timeslots, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('renders meal rows and non-meal custom rows', async () => {
    const schedules: IndividualSchedule[] = [{ fullName: 'Alice Johnson', email: '', age: '', entries: [] }];
    const slotsWithVariety: TimeSlot[] = [
      { periodKey: 'custom-breakfast', displayName: 'Breakfast', startTime: '08:00', endTime: '09:00', isCustom: true },
      { periodKey: 'custom-free-time', displayName: 'Free Time', startTime: '13:30', endTime: '15:45', isCustom: true },
    ];
    await downloadIndividualSchedules(schedules, slotsWithVariety, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('renders split-day workshop entries (days 1-2 and 3-4 in same period)', async () => {
    const schedules: IndividualSchedule[] = [
      {
        fullName: 'Bob Williams',
        email: '',
        age: '',
        entries: [
          {
            periodKey: 'MorningFirstPeriod',
            periodDisplay: 'Morning First Period',
            workshopName: 'Woodworking',
            leader: 'John Smith',
            location: 'Chapel A',
            startDay: 1,
            endDay: 2,
          },
          {
            periodKey: 'MorningFirstPeriod',
            periodDisplay: 'Morning First Period',
            workshopName: 'Pottery',
            leader: 'Jane Doe',
            location: 'Library',
            startDay: 3,
            endDay: 4,
          },
        ],
      },
    ];
    await downloadIndividualSchedules(schedules, timeslots, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('renders entry with no-location placeholder without appending location', async () => {
    const schedules: IndividualSchedule[] = [
      {
        fullName: 'Carol Davis',
        email: '',
        age: '',
        entries: [
          {
            periodKey: 'MorningFirstPeriod',
            periodDisplay: 'Morning First Period',
            workshopName: 'Yoga',
            leader: '',
            location: '(No Location)',
            startDay: 1,
            endDay: 4,
          },
        ],
      },
    ];
    await downloadIndividualSchedules(schedules, timeslots, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });

  it('handles multiple attendees (pageBreak on non-first pages)', async () => {
    const schedules: IndividualSchedule[] = [
      {
        fullName: 'Alice Johnson',
        email: '',
        age: '',
        entries: [
          {
            periodKey: 'MorningFirstPeriod',
            periodDisplay: 'Morning First Period',
            workshopName: 'Woodworking',
            leader: '',
            location: 'Chapel A',
            startDay: 1,
            endDay: 4,
          },
        ],
      },
      {
        fullName: 'Bob Williams',
        email: '',
        age: '',
        entries: [],
      },
    ];
    await downloadIndividualSchedules(schedules, timeslots, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
    expect(mockCompositeMap).toHaveBeenCalledTimes(2);
  });

  it('renders entry with a leader on a separate line', async () => {
    const schedules: IndividualSchedule[] = [
      {
        fullName: 'Alice Johnson',
        email: '',
        age: '',
        entries: [
          {
            periodKey: 'AfternoonPeriod',
            periodDisplay: 'Afternoon Period',
            workshopName: 'Painting',
            leader: 'Bob Artist',
            location: 'Library',
            startDay: 1,
            endDay: 4,
          },
        ],
      },
    ];
    await downloadIndividualSchedules(schedules, timeslots, 'Winter Adventure');
    expect(mockCreatePdf).toHaveBeenCalledOnce();
  });
});
