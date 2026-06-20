import { describe, it, expect } from 'vitest';
import { responsiveTablesRehypePlugin, readingTimeRemarkPlugin } from './frontmatter';

type MockElement = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: MockElement[];
};

type MockRoot = {
  type: 'root';
  children: MockElement[];
};

describe('responsiveTablesRehypePlugin', () => {
  const plugin = responsiveTablesRehypePlugin();

  it('does nothing when tree has no children', () => {
    const tree = { type: 'root' } as MockRoot & { children: undefined };
    // @ts-expect-error testing missing children
    plugin(tree);
    expect(tree).toEqual({ type: 'root' });
  });

  it('does not wrap non-table elements', () => {
    const p: MockElement = { type: 'element', tagName: 'p', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [p] };
    plugin(tree as Parameters<ReturnType<typeof responsiveTablesRehypePlugin>>[0]);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].tagName).toBe('p');
  });

  it('wraps a table in a scrollable div', () => {
    const table: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [table] };
    plugin(tree as Parameters<ReturnType<typeof responsiveTablesRehypePlugin>>[0]);
    expect(tree.children).toHaveLength(1);
    const wrapper = tree.children[0];
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties).toEqual({ style: 'overflow:auto' });
    expect(wrapper.children?.[0]).toBe(table);
  });

  it('wraps the first of two consecutive tables (documents i++ skip behavior)', () => {
    // The plugin increments i after wrapping, so two back-to-back tables result in
    // only the first being wrapped — the i++ causes the loop to skip the second.
    const table1: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const table2: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [table1, table2] };
    plugin(tree as Parameters<ReturnType<typeof responsiveTablesRehypePlugin>>[0]);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].tagName).toBe('div');
    expect(tree.children[1].tagName).toBe('table');
  });

  it('leaves non-table siblings untouched while wrapping tables', () => {
    const p: MockElement = { type: 'element', tagName: 'p', properties: {}, children: [] };
    const table: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [p, table] };
    plugin(tree as Parameters<ReturnType<typeof responsiveTablesRehypePlugin>>[0]);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].tagName).toBe('p');
    expect(tree.children[1].tagName).toBe('div');
    expect(tree.children[1].children?.[0]).toBe(table);
  });
});

describe('readingTimeRemarkPlugin', () => {
  const plugin = readingTimeRemarkPlugin();

  it('sets readingTime on frontmatter as a positive integer', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Hello world. '.repeat(200) }] }],
    };
    const file = { data: { astro: { frontmatter: {} as Record<string, unknown> } } };
    plugin(
      tree as Parameters<ReturnType<typeof readingTimeRemarkPlugin>>[0],
      file as Parameters<ReturnType<typeof readingTimeRemarkPlugin>>[1]
    );
    expect(typeof file.data.astro.frontmatter.readingTime).toBe('number');
    expect(file.data.astro.frontmatter.readingTime).toBeGreaterThan(0);
  });

  it('does not throw when frontmatter is absent', () => {
    const tree = { type: 'root', children: [] };
    const file = { data: {} };
    expect(() =>
      plugin(
        tree as Parameters<ReturnType<typeof readingTimeRemarkPlugin>>[0],
        file as Parameters<ReturnType<typeof readingTimeRemarkPlugin>>[1]
      )
    ).not.toThrow();
  });
});
