import { describe, it, expect } from 'vitest';
import { resolveOverlays } from '~/components/schedule/mapCompositor';

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
