import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const events = await getCollection('event');
  return events.map((event) => ({
    params: { id: event.id },
    props: { event },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { event } = props as { event: CollectionEntry<'event'> };
  const { data, id } = event;

  const fmtDate = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  const end = data.endDate ?? data.date;
  const nextDay = new Date(end);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const esc = (s: string) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/[,;]/g, (c) => `\\${c}`)
      .replace(/\n/g, '\\n');

  const location = [data.location, data.address].filter(Boolean).join(', ');
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ECRS//ECRS Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}@ecrs.org`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${fmtDate(data.date)}`,
    `DTEND;VALUE=DATE:${fmtDate(nextDay)}`,
    `SUMMARY:${esc(data.title)}`,
    location && `LOCATION:${esc(location)}`,
    (data.excerpt || data.description) && `DESCRIPTION:${esc(data.excerpt ?? data.description ?? '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return new Response(lines, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}.ics"`,
    },
  });
};
