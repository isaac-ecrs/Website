import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { resolveOverlays, compositeMap } from '~/components/schedule/mapCompositor';

describe('resolveOverlays', () => {
  it('returns the correct overlay filename for a known location', () => {
    expect(resolveOverlays(['Chapel A'])).toEqual(['watson_layout_chapel_a.png']);
  });

  it('matches case-insensitively', () => {
    expect(resolveOverlays(['chapel a'])).toEqual(['watson_layout_chapel_a.png']);
    expect(resolveOverlays(['LIBRARY'])).toEqual(['watson_layout_library.png']);
  });

  it('trims whitespace before matching', () => {
    expect(resolveOverlays(['  Elm Room  '])).toEqual(['watson_layout_elm_room.png']);
  });

  it('returns empty array for unknown location', () => {
    expect(resolveOverlays(['Unknown Place'])).toEqual([]);
  });

  it('returns empty array when given no locations', () => {
    expect(resolveOverlays([])).toEqual([]);
  });

  it('adds Stairs overlay when Rec Hall is in locations', () => {
    const overlays = resolveOverlays(['Rec Hall']);
    expect(overlays).toContain('watson_layout_stairs.png');
  });

  it('adds Stairs overlay when Craft Room is in locations', () => {
    const overlays = resolveOverlays(['Craft Room']);
    expect(overlays).toContain('watson_layout_stairs.png');
  });

  it('does not duplicate Stairs when already mapped via name', () => {
    const overlays = resolveOverlays(['Rec Hall', 'Craft Room']);
    expect(overlays.filter((f) => f === 'watson_layout_stairs.png')).toHaveLength(1);
  });

  it('handles multiple locations and deduplicates', () => {
    const overlays = resolveOverlays(['Library', 'Martin Room', 'Library']);
    expect(overlays).toContain('watson_layout_library.png');
    expect(overlays).toContain('watson_layout_martin_room.png');
    expect(overlays.filter((f) => f === 'watson_layout_library.png')).toHaveLength(1);
  });

  it('includes Chapel overlay for Chapel location', () => {
    expect(resolveOverlays(['Chapel'])).toEqual(['watson_layout_chapel.png']);
  });
});

describe('compositeMap', () => {
  class MockImage {
    naturalWidth = 800;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';

    get src() {
      return this._src;
    }
    set src(url: string) {
      this._src = url;
      const cb = this.onload;
      if (cb) queueMicrotask(() => cb());
    }
  }

  const mockCtx = { drawImage: vi.fn() };
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(mockCtx),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,MOCK'),
  };

  beforeAll(() => {
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('document', { createElement: vi.fn().mockReturnValue(mockCanvas) });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('returns a data URL string', async () => {
    const result = await compositeMap(['Library']);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^data:/);
  });

  it('returns a data URL for empty locations (base map only)', async () => {
    const result = await compositeMap([]);
    expect(result).toMatch(/^data:/);
  });

  it('returns a data URL for an unknown location', async () => {
    const result = await compositeMap(['Unknown Place']);
    expect(result).toMatch(/^data:/);
  });

  it('uses the cached result for the same location set', async () => {
    const result1 = await compositeMap(['Martin Room']);
    const result2 = await compositeMap(['Martin Room']);
    expect(result1).toBe(result2);
  });
});
