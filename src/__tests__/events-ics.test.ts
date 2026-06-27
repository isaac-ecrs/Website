import { vi, describe, it, expect } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

import { vi } from 'vitest';
import { getCollection } from 'astro:content';
import { GET, getStaticPaths } from '../pages/events/[id].ics';

const makeEvent = (
  overrides: Partial<{
    id: string;
    title: string;
    date: Date;
    endDate: Date | undefined;
    location: string | undefined;
    address: string | undefined;
    excerpt: string | undefined;
    description: string | undefined;
  }> = {}
) => {
  const data = {
    title: 'Annual Gala',
    date: new Date('2024-05-15'),
    endDate: undefined as Date | undefined,
    location: undefined as string | undefined,
    address: undefined as string | undefined,
    excerpt: undefined as string | undefined,
    description: undefined as string | undefined,
    ...overrides,
  };
  return {
    id: overrides.id ?? 'annual-gala-2024',
    data,
  };
};

const callGet = async (event: ReturnType<typeof makeEvent>): Promise<string> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (await GET({ props: { event } } as any)).text();

describe('getStaticPaths', () => {
  it('maps each event to {params: {id}, props: {event}}', async () => {
    const fakeEvents = [makeEvent({ id: 'event-a' }), makeEvent({ id: 'event-b' })];
    vi.mocked(getCollection).mockResolvedValueOnce(fakeEvents as never);
    const paths = await getStaticPaths({} as never);
    expect(paths).toEqual([
      { params: { id: 'event-a' }, props: { event: fakeEvents[0] } },
      { params: { id: 'event-b' }, props: { event: fakeEvents[1] } },
    ]);
  });
});

describe('GET /events/[id].ics', () => {
  it('returns text/calendar content-type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({ props: { event: makeEvent() } } as any);
    expect(response.headers.get('Content-Type')).toBe('text/calendar;charset=utf-8');
  });

  it('sets Content-Disposition with the event id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({ props: { event: makeEvent() } } as any);
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="annual-gala-2024.ics"');
  });

  it('produces valid VCALENDAR/VEVENT wrapper', async () => {
    const text = await callGet(makeEvent());
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('END:VCALENDAR');
    expect(text).toContain('BEGIN:VEVENT');
    expect(text).toContain('END:VEVENT');
  });

  it('formats DTSTART from event date (UTC)', async () => {
    const text = await callGet(makeEvent({ date: new Date('2024-05-15') }));
    expect(text).toContain('DTSTART;VALUE=DATE:20240515');
  });

  it('computes DTEND as day after endDate when endDate is provided', async () => {
    const text = await callGet(makeEvent({ endDate: new Date('2024-05-16') }));
    expect(text).toContain('DTEND;VALUE=DATE:20240517');
  });

  it('computes DTEND as day after date when endDate is absent', async () => {
    const text = await callGet(makeEvent({ date: new Date('2024-06-01'), endDate: undefined }));
    expect(text).toContain('DTSTART;VALUE=DATE:20240601');
    expect(text).toContain('DTEND;VALUE=DATE:20240602');
  });

  it('includes the event title in SUMMARY', async () => {
    const text = await callGet(makeEvent({ title: 'Spring Concert' }));
    expect(text).toContain('SUMMARY:Spring Concert');
  });

  it('includes UID derived from event id', async () => {
    const text = await callGet(makeEvent({ id: 'spring-concert-2024' }));
    expect(text).toContain('UID:spring-concert-2024@ecrs.org');
  });

  it('escapes commas and semicolons in title', async () => {
    const text = await callGet(makeEvent({ title: 'Gala; A Night, To Remember' }));
    expect(text).toContain('SUMMARY:Gala\\; A Night\\, To Remember');
  });

  it('escapes backslashes in title', async () => {
    const text = await callGet(makeEvent({ title: 'Back\\slash' }));
    expect(text).toContain('SUMMARY:Back\\\\slash');
  });

  it('escapes newlines in title', async () => {
    const text = await callGet(makeEvent({ title: 'Line1\nLine2' }));
    expect(text).toContain('SUMMARY:Line1\\nLine2');
  });

  it('combines location and address into LOCATION', async () => {
    const text = await callGet(makeEvent({ location: 'Conference Center', address: '123 Main St' }));
    expect(text).toContain('LOCATION:Conference Center\\, 123 Main St');
  });

  it('omits LOCATION when neither location nor address is provided', async () => {
    const text = await callGet(makeEvent({ location: undefined, address: undefined }));
    expect(text).not.toContain('LOCATION:');
  });

  it('includes DESCRIPTION from excerpt when present', async () => {
    const text = await callGet(makeEvent({ excerpt: 'Join us for a great event' }));
    expect(text).toContain('DESCRIPTION:Join us for a great event');
  });

  it('falls back to description field when excerpt is absent', async () => {
    const text = await callGet(makeEvent({ excerpt: undefined, description: 'Full description here' }));
    expect(text).toContain('DESCRIPTION:Full description here');
  });

  it('omits DESCRIPTION when neither excerpt nor description is present', async () => {
    const text = await callGet(makeEvent({ excerpt: undefined, description: undefined }));
    expect(text).not.toContain('DESCRIPTION:');
  });

  it('uses CRLF line endings per RFC 5545', async () => {
    const text = await callGet(makeEvent());
    expect(text).toContain('\r\n');
    // Every line break should be CRLF, not bare LF
    const bareLF = text.replace(/\r\n/g, '').includes('\n');
    expect(bareLF).toBe(false);
  });

  it('folds lines longer than 75 octets per RFC 5545 §3.1', async () => {
    // "DESCRIPTION:" = 12 chars; 70 A's pushes total to 82 > 75
    const longDesc = 'A'.repeat(70);
    const text = await callGet(makeEvent({ description: longDesc }));
    const lines = text.split('\r\n');
    const descIdx = lines.findIndex((l) => l.startsWith('DESCRIPTION:'));
    expect(descIdx).toBeGreaterThanOrEqual(0);
    // First chunk must be exactly 75 chars
    expect(lines[descIdx]).toBe('DESCRIPTION:' + 'A'.repeat(63));
    // Continuation line: leading space + remaining 7 chars
    expect(lines[descIdx + 1]).toBe(' ' + 'A'.repeat(7));
  });
});
