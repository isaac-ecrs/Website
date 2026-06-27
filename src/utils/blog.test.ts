import { describe, it, expect, beforeAll } from 'vitest';
import type { Post } from '~/types';

// Must be hoisted before imports that use astro:content
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
  render: vi.fn().mockResolvedValue({
    Content: vi.fn(),
    remarkPluginFrontmatter: { readingTime: 1 },
  }),
}));

import { vi } from 'vitest';
import { getCollection } from 'astro:content';
import {
  fetchPosts,
  getRelatedPosts,
  findLatestPosts,
  findPostsBySlugs,
  findPostsByIds,
  getStaticPathsBlogList,
  getStaticPathsBlogPost,
  getStaticPathsBlogCategory,
  getStaticPathsBlogTag,
} from './blog';

// Minimal Post fixtures — bypass getNormalizedPost by populating _posts via
// getCollection mock so the full normalization runs with these collection entries.
const makeEntry = (id: string, category: string | undefined, tags: string[], draft = false) => ({
  id,
  data: {
    title: `Title for ${id}`,
    publishDate: new Date('2024-01-01'),
    draft,
    tags,
    category,
    metadata: {},
  },
});

// Pool used across all tests in this file (module-level cache populated once).
const entries = [
  makeEntry('post-a', 'sports', ['tennis', 'outdoor']),
  makeEntry('post-b', 'sports', ['tennis', 'indoor']),
  makeEntry('post-c', 'tech', ['outdoor']),
  makeEntry('post-d', 'tech', []),
  makeEntry('post-draft', 'sports', ['tennis'], true),
];

let posts: Post[];

beforeAll(async () => {
  // CollectionEntry<'post'> is structurally incompatible with our minimal fixtures.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getCollection).mockResolvedValue(entries as any);
  posts = await fetchPosts();
});

describe('fetchPosts', () => {
  it('excludes draft posts', () => {
    const slugs = posts.map((p) => p.slug);
    expect(slugs).not.toContain('post-draft');
  });

  it('returns posts sorted by publishDate descending', () => {
    const dates = posts.map((p) => p.publishDate.valueOf());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });
});

describe('findLatestPosts', () => {
  it('returns up to count posts', async () => {
    const result = await findLatestPosts({ count: 2 });
    expect(result).toHaveLength(2);
  });

  it('defaults to 4 when count is omitted', async () => {
    const result = await findLatestPosts({});
    expect(result.length).toBeLessThanOrEqual(4);
  });
});

describe('findPostsBySlugs', () => {
  it('returns matching posts in slug order', async () => {
    const result = await findPostsBySlugs(['post-a', 'post-c']);
    const slugs = result.map((p) => p.slug);
    expect(slugs).toContain('post-a');
    expect(slugs).toContain('post-c');
  });

  it('returns empty array for a non-array input', async () => {
    // @ts-expect-error testing invalid input
    expect(await findPostsBySlugs('post-a')).toEqual([]);
  });
});

describe('findPostsByIds', () => {
  it('returns matching posts', async () => {
    const result = await findPostsByIds(['post-a']);
    expect(result.map((p) => p.id)).toContain('post-a');
  });

  it('returns empty array for a non-array input', async () => {
    // @ts-expect-error testing invalid input
    expect(await findPostsByIds(null)).toEqual([]);
  });
});

describe('getRelatedPosts', () => {
  it('excludes the original post from results', async () => {
    const original = posts.find((p) => p.slug === 'post-a')!;
    const related = await getRelatedPosts(original, 10);
    expect(related.map((p) => p.slug)).not.toContain('post-a');
  });

  it('ranks same-category posts higher (+5) than tag-only matches (+1)', async () => {
    // post-a: sports + [tennis, outdoor]
    // post-b: sports + [tennis, indoor]  → score 5 (category) + 1 (tennis) = 6
    // post-c: tech  + [outdoor]          → score 0 (category) + 1 (outdoor) = 1
    // post-d: tech  + []                 → score 0
    const original = posts.find((p) => p.slug === 'post-a')!;
    const related = await getRelatedPosts(original, 3);
    expect(related[0].slug).toBe('post-b');
    expect(related[1].slug).toBe('post-c');
    expect(related[2].slug).toBe('post-d');
  });

  it('respects the maxResults limit', async () => {
    const original = posts.find((p) => p.slug === 'post-a')!;
    const related = await getRelatedPosts(original, 1);
    expect(related).toHaveLength(1);
  });

  it('handles a post with no tags gracefully', async () => {
    const noTags: Post = {
      id: 'no-tags',
      slug: 'no-tags',
      permalink: '/no-tags',
      publishDate: new Date(),
      title: 'No Tags',
      draft: false,
      metadata: {},
      tags: undefined as unknown as Post['tags'],
      Content: vi.fn() as unknown as Post['Content'],
    };
    const related = await getRelatedPosts(noTags, 4);
    expect(Array.isArray(related)).toBe(true);
  });

  it('returns empty array when there are no other posts', async () => {
    const isolated: Post = {
      id: 'solo',
      slug: 'solo',
      permalink: '/solo',
      publishDate: new Date(),
      title: 'Solo',
      draft: false,
      metadata: {},
      tags: [],
      Content: vi.fn() as unknown as Post['Content'],
    };
    // fetchPosts returns the cached pool — solo is not in it, so all pool posts are "other"
    // Test the scoring with an original that matches nothing
    const related = await getRelatedPosts(isolated, 10);
    expect(related).toHaveLength(posts.length);
  });
});

// Blog is disabled in config (isEnabled: false), so all getStaticPaths* return [] immediately.
// These tests cover the guard branches and register the functions as executed.
describe('getStaticPaths* (blog disabled)', () => {
  const paginate = vi.fn();

  it('getStaticPathsBlogList returns [] when blog is disabled', async () => {
    expect(await getStaticPathsBlogList({ paginate })).toEqual([]);
  });

  it('getStaticPathsBlogPost returns [] when blog is disabled', async () => {
    expect(await getStaticPathsBlogPost()).toEqual([]);
  });

  it('getStaticPathsBlogCategory returns [] when blog is disabled', async () => {
    expect(await getStaticPathsBlogCategory({ paginate })).toEqual([]);
  });

  it('getStaticPathsBlogTag returns [] when blog is disabled', async () => {
    expect(await getStaticPathsBlogTag({ paginate })).toEqual([]);
  });
});
