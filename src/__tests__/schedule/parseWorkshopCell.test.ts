import { describe, it, expect } from 'vitest';
import { parseWorkshopCell, normalizeName } from '~/components/schedule/excelParser';

describe('normalizeName', () => {
  it('converts all-caps to title case', () => {
    expect(normalizeName('JOHN SMITH')).toBe('John Smith');
  });

  it('converts all-lowercase to title case', () => {
    expect(normalizeName('jane doe')).toBe('Jane Doe');
  });

  it('leaves mixed-case names unchanged', () => {
    expect(normalizeName('Patricia')).toBe('Patricia');
    expect(normalizeName('McKenzie')).toBe('McKenzie');
  });

  it('handles hyphenated names', () => {
    expect(normalizeName('SMITH-JONES')).toBe('Smith-Jones');
  });

  it('handles single name', () => {
    expect(normalizeName('HEATHER')).toBe('Heather');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeName('')).toBe('');
  });
});

describe('parseWorkshopCell', () => {
  it('extracts workshop name and leader from valid format', () => {
    const result = parseWorkshopCell('Pottery (John Smith)');
    expect(result.name).toBe('Pottery');
    expect(result.leader).toBe('John Smith');
  });

  it('extracts leader with multiple names', () => {
    const result = parseWorkshopCell('Pottery (John Smith & Jane Doe)');
    expect(result.name).toBe('Pottery');
    expect(result.leader).toBe('John Smith & Jane Doe');
  });

  it('extracts long workshop name', () => {
    const result = parseWorkshopCell('Advanced Pottery and Ceramics Workshop (John Smith)');
    expect(result.name).toBe('Advanced Pottery and Ceramics Workshop');
    expect(result.leader).toBe('John Smith');
  });

  it('handles special characters in workshop name', () => {
    const result = parseWorkshopCell('Art & Craft: Pottery (John Smith)');
    expect(result.name).toBe('Art & Craft: Pottery');
    expect(result.leader).toBe('John Smith');
  });

  it('returns full string as name and empty leader when no parentheses', () => {
    const result = parseWorkshopCell('Pottery Workshop');
    expect(result.name).toBe('Pottery Workshop');
    expect(result.leader).toBe('');
  });

  it('handles complex real-world example', () => {
    const result = parseWorkshopCell('Woodworking & Carpentry Basics (Bob Johnson, Master Craftsman)');
    expect(result.name).toBe('Woodworking & Carpentry Basics');
    expect(result.leader).toBe('Bob Johnson, Master Craftsman');
  });

  it('trims whitespace around name and leader', () => {
    const result = parseWorkshopCell('Pottery   (  John Smith  )');
    expect(result.name).toBe('Pottery');
    expect(result.leader).toBe('John Smith');
  });

  // Dash format used in WA 2025 actual data
  it('extracts name and leader from dash format', () => {
    const result = parseWorkshopCell('Chair Yoga - Judi');
    expect(result.name).toBe('Chair Yoga');
    expect(result.leader).toBe('Judi');
  });

  it('handles co-leaders in dash format', () => {
    const result = parseWorkshopCell('Hat Game - Josh & Rachael');
    expect(result.name).toBe('Hat Game');
    expect(result.leader).toBe('Josh & Rachael');
  });

  it('handles slash-separated co-leaders in dash format', () => {
    const result = parseWorkshopCell('Games! - Lane w/ Heather');
    expect(result.name).toBe('Games!');
    expect(result.leader).toBe('Lane w/ Heather');
  });

  it('splits on last dash when workshop name contains a dash', () => {
    const result = parseWorkshopCell('Breathe & Be - Heather');
    expect(result.name).toBe('Breathe & Be');
    expect(result.leader).toBe('Heather');
  });

  it('returns full string as name when no dash and no parentheses', () => {
    const result = parseWorkshopCell('Pottery Workshop');
    expect(result.name).toBe('Pottery Workshop');
    expect(result.leader).toBe('');
  });
});
