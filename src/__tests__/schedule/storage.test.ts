import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  saveLocations,
  loadLocations,
  saveLocationHistory,
  loadLocationHistory,
  clearAll,
} from '~/components/schedule/storage';

let mockStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStore[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
};

beforeAll(() => {
  vi.stubGlobal('localStorage', mockLocalStorage);
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  mockStore = {};
});

describe('saveLocations / loadLocations', () => {
  it('saves and loads a locations map', () => {
    saveLocations({ 'Workshop A': 'Chapel A', 'Workshop B': 'Library' });
    expect(loadLocations()).toEqual({ 'Workshop A': 'Chapel A', 'Workshop B': 'Library' });
  });

  it('loadLocations returns an empty object when nothing is saved', () => {
    expect(loadLocations()).toEqual({});
  });

  it('overwrites previously saved locations', () => {
    saveLocations({ 'Workshop A': 'Chapel A' });
    saveLocations({ 'Workshop A': 'Library' });
    expect(loadLocations()).toEqual({ 'Workshop A': 'Library' });
  });
});

describe('saveLocationHistory / loadLocationHistory', () => {
  it('saves and loads a history list', () => {
    saveLocationHistory(['Chapel A', 'Library']);
    const history = loadLocationHistory();
    expect(history).toContain('Chapel A');
    expect(history).toContain('Library');
  });

  it('loadLocationHistory returns an empty array when nothing is saved', () => {
    expect(loadLocationHistory()).toEqual([]);
  });

  it('deduplicates entries when merging with existing history', () => {
    saveLocationHistory(['Chapel A', 'Library']);
    saveLocationHistory(['Chapel A', 'Martin Room']);
    const history = loadLocationHistory();
    expect(history.filter((h) => h === 'Chapel A')).toHaveLength(1);
    expect(history).toContain('Library');
    expect(history).toContain('Martin Room');
  });

  it('caps history at 50 entries', () => {
    const many = Array.from({ length: 60 }, (_, i) => `Location ${i}`);
    saveLocationHistory(many);
    expect(loadLocationHistory().length).toBeLessThanOrEqual(50);
  });
});

describe('clearAll', () => {
  it('removes both saved locations and history', () => {
    saveLocations({ 'Workshop A': 'Chapel A' });
    saveLocationHistory(['Chapel A', 'Library']);
    clearAll();
    expect(loadLocations()).toEqual({});
    expect(loadLocationHistory()).toEqual([]);
  });
});

describe('localStorage error handling', () => {
  it('loadLocations returns empty object when getItem throws', () => {
    vi.spyOn(mockLocalStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(loadLocations()).toEqual({});
    vi.restoreAllMocks();
  });

  it('loadLocationHistory returns empty array when getItem throws', () => {
    vi.spyOn(mockLocalStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(loadLocationHistory()).toEqual([]);
    vi.restoreAllMocks();
  });
});
