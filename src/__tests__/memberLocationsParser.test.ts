import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { MemberLocationAccumulator } from '../components/widgets/memberLocationsParser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeXlsx(rows: (string | number | null)[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function makeXlsxWith(headers: string[], dataRows: (string | number | null)[][]): ArrayBuffer {
  return makeXlsx([headers, ...dataRows]);
}

function makeCsv(lines: string[]): ArrayBuffer {
  const text = lines.join('\n');
  return new TextEncoder().encode(text).buffer;
}

// ---------------------------------------------------------------------------
// MemberLocationAccumulator – basic ingestion
// ---------------------------------------------------------------------------

describe('MemberLocationAccumulator', () => {
  it('ingests a minimal US row and finalises to one city', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_PostalCode', 'Address_CountryCode'],
        [['alice@example.com', 'Philadelphia', 'PA', '19103', 'US']]
      )
    );
    const result = acc.finalise();
    expect(result.cities).toHaveLength(1);
    expect(result.cities[0]).toMatchObject({ name: 'Philadelphia, PA', country: 'US', state: 'PA', count: 1 });
    expect(result.stats.uniqueEmails).toBe(1);
    expect(result.stats.rowsRead).toBe(1);
  });

  it('deduplicates by email — keeps row with newer timestamp', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode', 'Entry_DateSubmitted'],
        [
          ['alice@example.com', 'Boston', 'MA', 'US', '2024-01-01'],
          ['alice@example.com', 'New York', 'NY', 'US', '2024-06-01'],
        ]
      )
    );
    const result = acc.finalise();
    expect(result.cities).toHaveLength(1);
    expect(result.cities[0].name).toBe('New York, NY');
    expect(result.stats.uniqueEmails).toBe(1);
  });

  it('keeps older row when newer has no timestamp', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode', 'Entry_DateSubmitted'],
        [
          ['bob@example.com', 'Seattle', 'WA', 'US', '2024-03-01'],
          ['bob@example.com', 'Portland', 'OR', 'US', ''],
        ]
      )
    );
    const result = acc.finalise();
    expect(result.cities[0].name).toBe('Seattle, WA');
  });

  it('aggregates multiple emails to the same city and increments count', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [
          ['a@x.com', 'Chicago', 'IL', 'US'],
          ['b@x.com', 'Chicago', 'IL', 'US'],
          ['c@x.com', 'Chicago', 'IL', 'US'],
        ]
      )
    );
    const result = acc.finalise();
    expect(result.cities).toHaveLength(1);
    expect(result.cities[0].count).toBe(3);
  });

  it('sorts cities by count descending', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [
          ['a@x.com', 'Austin', 'TX', 'US'],
          ['b@x.com', 'Denver', 'CO', 'US'],
          ['c@x.com', 'Denver', 'CO', 'US'],
        ]
      )
    );
    const result = acc.finalise();
    expect(result.cities[0].name).toBe('Denver, CO');
    expect(result.cities[1].name).toBe('Austin, TX');
  });

  it('skips rows with no email', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [
          ['', 'Nowhere', 'XX', 'US'],
          ['valid@x.com', 'Boston', 'MA', 'US'],
        ]
      )
    );
    const result = acc.finalise();
    expect(result.stats.uniqueEmails).toBe(1);
  });

  it('skips completely empty rows', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [
          ['a@x.com', 'Boston', 'MA', 'US'],
          ['', '', '', ''],
        ]
      )
    );
    const result = acc.finalise();
    expect(result.stats.rowsRead).toBe(2);
    expect(result.stats.uniqueEmails).toBe(1);
  });

  it('skips US rows with no state (counted as skipped in finalise)', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [['ghost@x.com', 'SomeCity', '', 'US']]
      )
    );
    const result = acc.finalise();
    expect(result.cities).toHaveLength(0);
    expect(result.stats.skipped).toBe(1);
  });

  it('handles sheets with no data rows', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(makeXlsx([['Email', 'Address_City', 'Address_State']]));
    const result = acc.finalise();
    expect(result.cities).toHaveLength(0);
    expect(result.stats.rowsRead).toBe(0);
  });

  it('ingests multiple files and merges results', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [['a@x.com', 'Miami', 'FL', 'US']]
      )
    );
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [['b@x.com', 'Miami', 'FL', 'US']]
      )
    );
    const result = acc.finalise();
    expect(result.stats.uniqueEmails).toBe(2);
    expect(result.cities[0].count).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Column name variants
  // -------------------------------------------------------------------------

  it('finds email via "Email Address" header variant', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email Address', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [['variant@x.com', 'Detroit', 'MI', 'US']]
      )
    );
    expect(acc.uniqueEmails).toBe(1);
  });

  it('finds timestamp via "Date Submitted" header variant', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode', 'Date Submitted'],
        [
          ['x@x.com', 'Memphis', 'TN', 'US', '2024-01-01'],
          ['x@x.com', 'Nashville', 'TN', 'US', '2024-12-01'],
        ]
      )
    );
    expect(acc.finalise().cities[0].name).toBe('Nashville, TN');
  });

  // -------------------------------------------------------------------------
  // Canadian addresses
  // -------------------------------------------------------------------------

  it('maps Canadian FSA prefix to province', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_PostalCode', 'Address_CountryCode'],
        [['ca@x.com', 'Toronto', '', 'M5V 2T6', 'CA']]
      )
    );
    const result = acc.finalise();
    expect(result.cities[0]).toMatchObject({ country: 'CA', state: 'ON' });
    expect(result.cities[0].lat).toBeCloseTo(43.65, 1);
  });

  it('handles Canadian address with full country name', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_PostalCode', 'Address_Country'],
        [['ca2@x.com', 'Vancouver', 'BC', 'V6B 1A1', 'canada']]
      )
    );
    const result = acc.finalise();
    expect(result.cities[0].country).toBe('CA');
    expect(result.cities[0].state).toBe('BC');
  });

  it('uses city fallback from FSA prefix when city is empty', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_PostalCode', 'Address_CountryCode'],
        [['ca3@x.com', '', 'H3A 1B2', 'CA']]
      )
    );
    const result = acc.finalise();
    expect(result.cities[0].name).toBe('H3A, CA');
  });

  // -------------------------------------------------------------------------
  // International addresses
  // -------------------------------------------------------------------------

  it('maps "United Kingdom" country name to GB', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(['Email', 'Address_City', 'Address_CountryCode'], [['uk@x.com', 'London', 'United Kingdom']])
    );
    const result = acc.finalise();
    expect(result.cities[0].country).toBe('GB');
    expect(result.cities[0].name).toBe('London, GB');
  });

  it('handles 2-letter ISO country code directly', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(makeXlsxWith(['Email', 'Address_City', 'Address_CountryCode'], [['de@x.com', 'Berlin', 'DE']]));
    expect(acc.finalise().cities[0].country).toBe('DE');
  });

  it('uses first 2 chars of unknown country name as fallback', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(['Email', 'Address_City', 'Address_CountryCode'], [['xx@x.com', 'Somewhere', 'Freedonia']])
    );
    expect(acc.finalise().cities[0].country).toBe('FR');
  });

  it('defaults to US when country is empty', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
        [['us@x.com', 'Portland', 'ME', '']]
      )
    );
    expect(acc.finalise().cities[0].country).toBe('US');
  });

  // -------------------------------------------------------------------------
  // Attendee emails
  // -------------------------------------------------------------------------

  it('picks up additional attendee emails from AttendeeInformation columns', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        [
          'Email',
          'Address_City',
          'Address_State',
          'Address_CountryCode',
          'AttendeeInformation_1_Email',
          'AttendeeInformation_2_Email',
        ],
        [['primary@x.com', 'Baltimore', 'MD', 'US', 'attendee1@x.com', 'attendee2@x.com']]
      )
    );
    const result = acc.finalise();
    expect(result.stats.uniqueEmails).toBe(3);
    expect(result.cities[0].count).toBe(3);
  });

  it('does not double-count attendee email that matches primary email', () => {
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode', 'AttendeeInformation_1_Email'],
        [['same@x.com', 'Raleigh', 'NC', 'US', 'same@x.com']]
      )
    );
    expect(acc.finalise().stats.uniqueEmails).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Excel serial date parsing
  // -------------------------------------------------------------------------

  it('parses Excel serial date numbers for timestamp comparison', () => {
    // Serial 45291 ≈ 2023-12-31; serial 45658 ≈ 2025-01-02
    const acc = new MemberLocationAccumulator();
    acc.ingest(
      makeXlsxWith(
        ['Email', 'Address_City', 'Address_State', 'Address_CountryCode', 'Entry_DateSubmitted'],
        [
          ['serial@x.com', 'Omaha', 'NE', 'US', 45291],
          ['serial@x.com', 'Lincoln', 'NE', 'US', 45658],
        ]
      )
    );
    expect(acc.finalise().cities[0].name).toBe('Lincoln, NE');
  });

  // -------------------------------------------------------------------------
  // ingestCsv
  // -------------------------------------------------------------------------

  describe('ingestCsv', () => {
    it('fills in missing address for existing email from mailchimp CSV', () => {
      const acc = new MemberLocationAccumulator();
      // First ingest an XLSX row with no city/state/zip
      acc.ingest(
        makeXlsxWith(
          ['Email', 'Address_City', 'Address_State', 'Address_PostalCode', 'Address_CountryCode'],
          [['mc@x.com', '', '', '', '']]
        )
      );
      // ingestCsv looks for a header that normalizes to 'email' (exact match)
      const csv = makeCsv([
        'Email,First Name,Last Name,City,State/Province,Zip/Postal Code,Country,Last Changed',
        'mc@x.com,Mo,Test,Atlanta,GA,30301,US,2024-03-01 12:00:00',
      ]);
      acc.ingestCsv(csv);
      const result = acc.finalise();
      expect(result.cities[0].name).toBe('Atlanta, GA');
    });

    it('does not add new emails from mailchimp CSV', () => {
      const acc = new MemberLocationAccumulator();
      const csv = makeCsv([
        'Email,City,State/Province,Zip/Postal Code,Country,Last Changed',
        'newperson@x.com,Denver,CO,80201,US,2024-01-01',
      ]);
      acc.ingestCsv(csv);
      expect(acc.uniqueEmails).toBe(0);
    });

    it('does not overwrite existing address that already has data', () => {
      const acc = new MemberLocationAccumulator();
      acc.ingest(
        makeXlsxWith(
          ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
          [['keep@x.com', 'Boston', 'MA', 'US']]
        )
      );
      const csv = makeCsv([
        'Email,City,State/Province,Zip/Postal Code,Country,Last Changed',
        'keep@x.com,New York,NY,10001,US,2024-01-01',
      ]);
      acc.ingestCsv(csv);
      expect(acc.finalise().cities[0].name).toBe('Boston, MA');
    });

    it('handles quoted CSV fields correctly', () => {
      const acc = new MemberLocationAccumulator();
      acc.ingest(
        makeXlsxWith(
          ['Email', 'Address_City', 'Address_State', 'Address_PostalCode', 'Address_CountryCode'],
          [['quoted@x.com', '', '', '', '']]
        )
      );
      const csv = makeCsv([
        'Email,City,State/Province,Zip/Postal Code,Country,Last Changed',
        '"quoted@x.com","San Francisco","CA","94102","US","2024-06-01 00:00:00"',
      ]);
      acc.ingestCsv(csv);
      expect(acc.finalise().cities[0].name).toBe('San Francisco, CA');
    });

    it('returns early when CSV has no email column', () => {
      const acc = new MemberLocationAccumulator();
      acc.ingest(
        makeXlsxWith(
          ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
          [['noemail@x.com', 'Austin', 'TX', 'US']]
        )
      );
      const csv = makeCsv(['Name,City', 'Alice,Houston']);
      expect(() => acc.ingestCsv(csv)).not.toThrow();
    });

    it('returns early on CSV with fewer than 2 lines', () => {
      const acc = new MemberLocationAccumulator();
      const csv = makeCsv(['Email Address,City']);
      expect(() => acc.ingestCsv(csv)).not.toThrow();
    });

    it('skips CSV data rows with no location info', () => {
      const acc = new MemberLocationAccumulator();
      acc.ingest(
        makeXlsxWith(
          ['Email', 'Address_City', 'Address_State', 'Address_PostalCode', 'Address_CountryCode'],
          [['noloc@x.com', '', '', '', '']]
        )
      );
      const csv = makeCsv([
        'Email,City,State/Province,Zip/Postal Code,Country,Last Changed',
        'noloc@x.com,,,,"US","2024-01-01"',
      ]);
      acc.ingestCsv(csv);
      // still no usable address
      expect(acc.finalise().cities).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // finalise – stats
  // -------------------------------------------------------------------------

  describe('finalise', () => {
    it('returns generatedAt as a valid ISO timestamp', () => {
      const acc = new MemberLocationAccumulator();
      const result = acc.finalise();
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
    });

    it('resets skipped counter on each call', () => {
      const acc = new MemberLocationAccumulator();
      acc.ingest(
        makeXlsxWith(
          ['Email', 'Address_City', 'Address_State', 'Address_CountryCode'],
          [['nogeo@x.com', 'NoCity', '', 'US']]
        )
      );
      const r1 = acc.finalise();
      const r2 = acc.finalise();
      expect(r1.stats.skipped).toBe(1);
      expect(r2.stats.skipped).toBe(1);
    });
  });
});
