import { vi, describe, it, expect } from 'vitest';
import type { ImageMetadata } from 'astro';

vi.mock('astro:assets', () => ({
  getImage: vi.fn().mockResolvedValue({
    src: '/optimized/image.jpg',
    attributes: { width: 1200, height: 626 },
  }),
}));

import { findImage, adaptOpenGraphImages } from './images';

describe('findImage', () => {
  it('returns null as-is', async () => {
    expect(await findImage(null)).toBeNull();
  });

  it('returns undefined as-is', async () => {
    expect(await findImage(undefined)).toBeUndefined();
  });

  it('returns ImageMetadata objects as-is (non-string)', async () => {
    const meta = { src: '/local.jpg', width: 800, height: 600, format: 'jpg' } as ImageMetadata;
    expect(await findImage(meta)).toBe(meta);
  });

  it('returns http URLs unchanged', async () => {
    expect(await findImage('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
  });

  it('returns https URLs unchanged', async () => {
    expect(await findImage('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });

  it('returns public-dir paths (starting with /) unchanged', async () => {
    expect(await findImage('/images/logo.png')).toBe('/images/logo.png');
  });

  it('returns arbitrary strings that are not ~/assets/images paths unchanged', async () => {
    expect(await findImage('some-relative-path.jpg')).toBe('some-relative-path.jpg');
  });

  it('returns null for ~/assets/images paths that cannot be resolved in the test environment', async () => {
    // import.meta.glob is not populated in the Vitest environment, so the glob
    // map is empty and the loader will be undefined → findImage returns null.
    expect(await findImage('~/assets/images/nonexistent.jpg')).toBeNull();
  });
});

const SITE = new URL('https://ecrs.org');

describe('adaptOpenGraphImages', () => {
  // Note: the default `astroSite = new URL('')` throws in Node, so all calls
  // must pass an explicit second argument even when astroSite is not used.

  it('returns the original object when images array is empty', async () => {
    const og = { type: 'website' as const, images: [] };
    expect(await adaptOpenGraphImages(og, SITE)).toBe(og);
  });

  it('returns the original object when images is absent', async () => {
    const og = { type: 'website' as const };
    expect(await adaptOpenGraphImages(og, SITE)).toBe(og);
  });

  it('returns empty object for undefined input', async () => {
    const result = await adaptOpenGraphImages(undefined, SITE);
    expect(result).toEqual({});
  });

  it('produces absolute optimized URLs for remote image sources', async () => {
    const og = { images: [{ url: 'https://example.com/img.jpg' }] };
    const result = await adaptOpenGraphImages(og, SITE);
    expect(result.images?.[0]?.url).toBe('https://ecrs.org/optimized/image.jpg');
  });

  it('returns an empty url entry when the image url is absent', async () => {
    const og = { images: [{}] };
    const result = await adaptOpenGraphImages(og, SITE);
    expect(result.images?.[0]?.url).toBe('');
  });
});
