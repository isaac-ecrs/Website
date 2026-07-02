import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { resolveVenue } from '~/utils/resolveEvent';

export const getStaticPaths: GetStaticPaths = async () => {
  const events = await getCollection('event');
  const sites = await getCollection('site');
  const siteMap = new Map(sites.map((s) => [s.id, s.data]));
  return events.map((event) => ({
    params: { id: event.id },
    props: { event, siteData: event.data.siteId ? siteMap.get(event.data.siteId) : undefined },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { event, siteData } = props as { event: CollectionEntry<'event'>; siteData?: CollectionEntry<'site'>['data'] };
  const { data, id } = event;
  const venue = resolveVenue(data, siteData);

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

  // RFC 5545 §3.1: fold lines longer than 75 octets with CRLF + leading space.
  const fold = (line: string): string => {
    const out: string[] = [];
    while (line.length > 75) {
      out.push(line.slice(0, 75));
      line = ' ' + line.slice(75);
    }
    out.push(line);
    return out.join('\r\n');
  };

  const location = [venue.location, venue.address].filter(Boolean).join(', ');
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const lines =
    [
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
      .filter((x): x is string => !!x)
      .map(fold)
      .join('\r\n') + '\r\n';

  return new Response(lines, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}.ics"`,
    },
  });
};
