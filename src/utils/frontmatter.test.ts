import { describe, it, expect } from 'vitest';
import { responsiveTablesRehypePlugin } from './frontmatter';

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
  // RehypePlugin is typed as a unified Processor method, so calling it standalone
  // requires casting the function itself to drop the `this: Processor` constraint.
  const plugin = (responsiveTablesRehypePlugin as unknown as () => (tree: unknown) => void)();

  it('does nothing when tree has no children', () => {
    const tree = { type: 'root' } as MockRoot & { children: undefined };
    plugin(tree);
    expect(tree).toEqual({ type: 'root' });
  });

  it('does not wrap non-table elements', () => {
    const p: MockElement = { type: 'element', tagName: 'p', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [p] };
    plugin(tree);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].tagName).toBe('p');
  });

  it('wraps a table in a scrollable div', () => {
    const table: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [table] };
    plugin(tree);
    expect(tree.children).toHaveLength(1);
    const wrapper = tree.children[0];
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties).toEqual({ style: 'overflow:auto' });
    expect(wrapper.children?.[0]).toBe(table);
  });

  it('wraps both of two consecutive tables', () => {
    const table1: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const table2: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [table1, table2] };
    plugin(tree);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].tagName).toBe('div');
    expect(tree.children[0].children?.[0]).toBe(table1);
    expect(tree.children[1].tagName).toBe('div');
    expect(tree.children[1].children?.[0]).toBe(table2);
  });

  it('leaves non-table siblings untouched while wrapping tables', () => {
    const p: MockElement = { type: 'element', tagName: 'p', properties: {}, children: [] };
    const table: MockElement = { type: 'element', tagName: 'table', properties: {}, children: [] };
    const tree: MockRoot = { type: 'root', children: [p, table] };
    plugin(tree);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].tagName).toBe('p');
    expect(tree.children[1].tagName).toBe('div');
    expect(tree.children[1].children?.[0]).toBe(table);
  });
});
