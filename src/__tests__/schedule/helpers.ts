import * as XLSX from 'xlsx';

type SheetData = (string | number | null | undefined)[][];

export function buildWorkbook(sheets: Record<string, SheetData>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export const CLASS_SELECTION_HEADERS = ['ClassSelection_Id', 'Name_First', 'Name_Last', 'Email', 'Age'];

export const PERIOD_HEADERS = [
  'ClassSelection_Id',
  'AttendeeName_First',
  'AttendeeName_Last',
  'AttendeeName',
  '2024WinterAdventureClassRegist_Id',
  '_4dayClasses',
  'ChoiceNumber',
  '_2dayClassesFirst2Days',
  '_2dayClassesSecond2Days',
];

export function makeClassSelectionSheet(rows: (string | number | null | undefined)[][]): SheetData {
  return [CLASS_SELECTION_HEADERS, ...rows];
}

export function makePeriodSheet(rows: (string | number | null | undefined)[][]): SheetData {
  return [PERIOD_HEADERS, ...rows];
}
