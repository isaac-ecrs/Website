/**
 * Parses Cognito Forms event registration Excel exports into aggregated
 * member location data. Deduplicates by email (newest submission wins).
 * No PII is stored in the output — only city-level location + count.
 */

import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberCity {
  name: string;
  country: string;
  state: string | null;
  lat: number | null;
  lng: number | null;
  count: number;
}

export interface ParseResult {
  cities: MemberCity[];
  generatedAt: string;
  stats: {
    rowsRead: number;
    uniqueEmails: number;
    skipped: number;
  };
}

// Internal record: one per unique email, kept across multiple file uploads.
interface EmailRecord {
  email: string;
  address: RawAddress;
  submittedAt: Date;
}

interface RawAddress {
  city: string;
  state: string;
  zip: string;
  country: string; // ISO-2 or full name
}

// ---------------------------------------------------------------------------
// Column detection helpers
// ---------------------------------------------------------------------------

type Headers = Record<string, string>; // colKey (A, B, …) → header text

function buildHeaderMap(row: string[]): Headers {
  const map: Headers = {};
  row.forEach((h, i) => {
    if (h) map[XLSX.utils.encode_col(i)] = h.trim();
  });
  return map;
}

function findCol(headers: Headers, ...candidates: string[]): string | null {
  const lower = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const c of candidates) {
    for (const [key, val] of Object.entries(headers)) {
      if (lower(val) === lower(c)) return key;
    }
  }
  // Partial match fallback
  for (const c of candidates) {
    const pat = lower(c);
    for (const [key, val] of Object.entries(headers)) {
      if (lower(val).includes(pat)) return key;
    }
  }
  return null;
}

function findAllCols(headers: Headers, pattern: string): string[] {
  const pat = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
  return Object.entries(headers)
    .filter(([, v]) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .includes(pat)
    )
    .map(([k]) => k);
}

function cell(row: string[], col: string | null): string {
  if (!col) return '';
  return (row[XLSX.utils.decode_col(col)] ?? '').toString().trim();
}

// ---------------------------------------------------------------------------
// Address normalisation
// ---------------------------------------------------------------------------

const COUNTRY_NAMES: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  canada: 'CA',
  'united kingdom': 'GB',
  uk: 'GB',
  germany: 'DE',
  france: 'FR',
  australia: 'AU',
  'new zealand': 'NZ',
  japan: 'JP',
  brazil: 'BR',
  mexico: 'MX',
  ireland: 'IE',
  netherlands: 'NL',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  switzerland: 'CH',
};

function normalizeCountry(raw: string): string {
  if (!raw) return 'US';
  const lo = raw.trim().toLowerCase();
  if (COUNTRY_NAMES[lo]) return COUNTRY_NAMES[lo];
  if (raw.length === 2) return raw.toUpperCase();
  return raw.substring(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Canadian FSA → province + approximate centroid
// ---------------------------------------------------------------------------

const CA_FSA: Record<string, { province: string; lat: number; lng: number }> = {
  V: { province: 'BC', lat: 49.28, lng: -123.12 },
  T: { province: 'AB', lat: 51.05, lng: -114.07 },
  S: { province: 'SK', lat: 52.13, lng: -106.67 },
  R: { province: 'MB', lat: 49.9, lng: -97.14 },
  K: { province: 'ON', lat: 45.42, lng: -75.69 },
  L: { province: 'ON', lat: 43.7, lng: -79.42 },
  M: { province: 'ON', lat: 43.65, lng: -79.38 },
  N: { province: 'ON', lat: 43.25, lng: -81.5 },
  P: { province: 'ON', lat: 46.5, lng: -80.99 },
  G: { province: 'QC', lat: 46.81, lng: -71.21 },
  H: { province: 'QC', lat: 45.5, lng: -73.57 },
  J: { province: 'QC', lat: 45.43, lng: -73.08 },
  E: { province: 'NB', lat: 46.5, lng: -66.5 },
  B: { province: 'NS', lat: 44.65, lng: -63.58 },
  C: { province: 'PE', lat: 46.24, lng: -63.13 },
  A: { province: 'NL', lat: 47.56, lng: -52.71 },
};

// ---------------------------------------------------------------------------
// Address → MemberCity aggregation
// ---------------------------------------------------------------------------

function addressToCity(addr: RawAddress): MemberCity | null {
  const country = normalizeCountry(addr.country);

  if (country === 'US') {
    const state = addr.state;
    const cityName = addr.city;

    if (!state) return null;
    const name = cityName ? `${cityName}, ${state}` : state;
    return { name, country: 'US', state, lat: null, lng: null, count: 0 };
  }

  if (country === 'CA') {
    const fsa = addr.zip ? addr.zip.substring(0, 1).toUpperCase() : '';
    const caInfo = CA_FSA[fsa] ?? null;
    const cityName = addr.city || addr.zip?.substring(0, 3) || 'Canada';
    return {
      name: `${cityName}, CA`,
      country: 'CA',
      state: caInfo?.province ?? addr.state ?? null,
      lat: caInfo?.lat ?? null,
      lng: caInfo?.lng ?? null,
      count: 0,
    };
  }

  // International
  const cityName = addr.city || country;
  return { name: `${cityName}, ${country}`, country, state: null, lat: null, lng: null, count: 0 };
}

// ---------------------------------------------------------------------------
// Excel sheet parsing
// ---------------------------------------------------------------------------

function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v ?? '') : '');
    }
    rows.push(row);
  }
  return rows;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Excel serial date numbers
  const n = Number(raw);
  if (!isNaN(n) && n > 40000) {
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

interface SheetParseResult {
  rowsRead: number;
  records: { email: string; address: RawAddress; submittedAt: Date | null }[];
}

function parseSheet(rows: string[][]): SheetParseResult {
  if (rows.length < 2) return { rowsRead: 0, records: [] };

  const headers = buildHeaderMap(rows[0]);

  // Primary registrant email
  const emailCol = findCol(headers, 'Email', 'EmailAddress', 'Email Address');

  // Submission timestamp
  const tsCol = findCol(
    headers,
    'Entry_DateSubmitted',
    'DateSubmitted',
    'Date Submitted',
    'Entry_Timestamp',
    'Timestamp',
    'Entry_DateCreated',
    'DateCreated'
  );

  // Address fields — Cognito uses Address_X or just X
  const cityCol = findCol(headers, 'Address_City', 'City');
  const stateCol = findCol(headers, 'Address_State', 'State');
  const zipCol = findCol(headers, 'Address_PostalCode', 'PostalCode', 'Postal Code', 'Zip', 'ZipCode', 'Zip Code');
  const countryCol = findCol(headers, 'Address_CountryCode', 'CountryCode', 'Address_Country', 'Country');

  // Attendee sub-section emails (e.g. AttendeeInformation_1_Email, AttendeeInformation_2_Email)
  const attendeeEmailCols = findAllCols(headers, 'Email').filter((c) => {
    const h = headers[c]?.toLowerCase() ?? '';
    return h.includes('attendee') && c !== emailCol;
  });

  const records: SheetParseResult['records'] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((v) => !v)) continue;

    const addr: RawAddress = {
      city: cell(row, cityCol),
      state: cell(row, stateCol),
      zip: cell(row, zipCol),
      country: cell(row, countryCol) || 'US',
    };

    const ts = tsCol ? parseDate(cell(row, tsCol)) : null;

    // Primary registrant
    const primaryEmail = emailCol ? cell(row, emailCol).toLowerCase().trim() : '';
    if (primaryEmail) {
      records.push({ email: primaryEmail, address: addr, submittedAt: ts });
    }

    // Additional attendees (all share the same registration address)
    for (const col of attendeeEmailCols) {
      const ae = cell(row, col).toLowerCase().trim();
      if (ae && ae !== primaryEmail) {
        records.push({ email: ae, address: addr, submittedAt: ts });
      }
    }
  }

  return { rowsRead: rows.length - 1, records };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Accumulate records across multiple file uploads; call finalise() when done.
export class MemberLocationAccumulator {
  // email → most recent record
  private byEmail = new Map<string, EmailRecord>();
  public rowsRead = 0;
  public skipped = 0;

  ingest(buffer: ArrayBuffer): void {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    } catch {
      throw new Error('Could not read file. Make sure it is a valid .xlsx file.');
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = sheetToRows(sheet);
      const { rowsRead, records } = parseSheet(rows);
      this.rowsRead += rowsRead;

      for (const rec of records) {
        const existing = this.byEmail.get(rec.email);
        const isNewer =
          !existing ||
          (rec.submittedAt && existing.submittedAt && rec.submittedAt > existing.submittedAt) ||
          (rec.submittedAt && !existing.submittedAt);

        if (isNewer) {
          this.byEmail.set(rec.email, {
            email: rec.email,
            address: rec.address,
            submittedAt: rec.submittedAt ?? new Date(0),
          });
        }
      }
    }
  }

  // Ingest a Mailchimp subscriber CSV export. Only fills in addresses for emails
  // not already seen from event data (event timestamps are newer, so they win).
  ingestCsv(buffer: ArrayBuffer): void {
    const text = new TextDecoder().decode(buffer);
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return;

    // Parse a CSV line handling quoted fields
    const parseLine = (line: string): string[] => {
      const fields: string[] = [];
      let i = 0;
      while (i < line.length) {
        if (line[i] === '"') {
          let val = '';
          i++; // skip opening quote
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') {
              val += '"';
              i += 2;
            } else if (line[i] === '"') {
              i++; // skip closing quote
              break;
            } else {
              val += line[i++];
            }
          }
          fields.push(val);
          if (line[i] === ',') i++;
        } else {
          const end = line.indexOf(',', i);
          if (end === -1) {
            fields.push(line.slice(i).trim());
            break;
          }
          fields.push(line.slice(i, end).trim());
          i = end + 1;
        }
      }
      return fields;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const col = (name: string) => headers.indexOf(name);

    const emailIdx = col('email');
    const cityIdx = col('city');
    const stateIdx = col('stateprovince');
    const zipIdx = col('zippostalcode');
    const countryIdx = col('country');
    const changedIdx = col('lastchanged');

    if (emailIdx === -1) return;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const row = parseLine(line);

      const email = (row[emailIdx] ?? '').toLowerCase().trim();
      if (!email) continue;

      const city = cityIdx !== -1 ? (row[cityIdx] ?? '').trim() : '';
      const state = stateIdx !== -1 ? (row[stateIdx] ?? '').trim() : '';
      const zip = zipIdx !== -1 ? (row[zipIdx] ?? '').trim() : '';
      const country = countryIdx !== -1 ? (row[countryIdx] ?? '').trim() : 'US';
      if (!city && !state && !zip) continue;

      const rawChanged = changedIdx !== -1 ? (row[changedIdx] ?? '') : '';
      const submittedAt = rawChanged ? new Date(rawChanged) : new Date(0);

      const existing = this.byEmail.get(email);
      // Only fill in addresses for known event attendees — don't add Mailchimp-only contacts.
      if (!existing) continue;
      // Only update if the existing record has no usable address.
      const hasAddress = existing.address.city || existing.address.state || existing.address.zip;
      if (!hasAddress) {
        this.byEmail.set(email, {
          email,
          address: { city, state, zip, country: country || 'US' },
          submittedAt,
        });
      }

      this.rowsRead++;
    }
  }

  get uniqueEmails(): number {
    return this.byEmail.size;
  }

  finalise(): ParseResult {
    const cityMap = new Map<string, MemberCity>();
    this.skipped = 0;

    for (const rec of this.byEmail.values()) {
      const city = addressToCity(rec.address);
      if (!city) {
        this.skipped++;
        continue;
      }
      const key = `${city.country}|${city.state ?? ''}|${city.name}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        cityMap.set(key, { ...city, count: 1 });
      }
    }

    const cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);

    return {
      cities,
      generatedAt: new Date().toISOString(),
      stats: {
        rowsRead: this.rowsRead,
        uniqueEmails: this.byEmail.size,
        skipped: this.skipped,
      },
    };
  }
}
